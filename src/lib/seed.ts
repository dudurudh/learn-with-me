import { db, getSettings, saveSettings, randomId } from './db'
import { planDate, toISODate } from './time'
import type { Curriculum, ProgressRecord, TimeBucket } from './types'

export const SEED_THROUGH_DAY = 200

/** Deterministic, so the demo history looks the same every time you turn it on. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const NOTES = [
  'Second page went faster. Still hedging the far vertical.',
  'Ran long — closer to forty minutes than twenty-five.',
  'Did the minimum. Bad day at work, but the page exists.',
  'Ellipses still drifting off the axis when I go fast.',
  'Best one was the fourth. First three were warm-up I did not plan for.',
  'Skipped the second half. Came back to it later and it was fine.',
  'Boxes finally clicking. The X method is not optional.',
  'Hated this one. Did it anyway.',
  'Stopped too late again — it was better ten minutes ago.',
  'Used the wrong paper and the marker bled. Worth knowing.',
  '',
  '',
  '',
]

const BUCKETS: TimeBucket[] = ['under10', '10to20', '20to40', '40plus']

async function fakePhotoBlob(rand: () => number): Promise<Blob | null> {
  // Browser only. Tests run headless and skip photo generation entirely.
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#F5F2EC'
  ctx.fillRect(0, 0, 240, 320)
  ctx.strokeStyle = 'rgba(34,32,29,0.55)'
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 0.4 + rand() * 1.6
    ctx.beginPath()
    ctx.moveTo(rand() * 240, rand() * 320)
    ctx.lineTo(rand() * 240, rand() * 320)
    ctx.stroke()
  }
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(40 + rand() * 160, 40 + rand() * 240, 18 + rand() * 40,
      8 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2)
    ctx.stroke()
  }
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7))
}

export async function hasRealProgress(): Promise<boolean> {
  const rows = await (await db()).getAll('progress')
  return rows.some((r) => r.seed !== true)
}

export interface SeedReport { days: number; photos: number }

export type SeedProgress = (done: number, total: number, stage: 'days' | 'photos') => void

/**
 * Fills the app with plausible history at day 200 so the heatmap and log can
 * be looked at without waiting seven months. Every record is tagged `seed`
 * and removal deletes exactly those, so real work is never caught up in it.
 */
export async function seedDemoData(
  curriculum: Curriculum,
  opts: { withPhotos?: boolean; onProgress?: SeedProgress } = {},
): Promise<SeedReport> {
  if (await hasRealProgress()) {
    throw new Error(
      'There is real progress in this app. Export it first — seeding refuses to run alongside your own data.',
    )
  }
  const settings = await getSettings()
  const rand = rng(20260913)
  const database = await db()
  const days = curriculum.days.filter((d) => d.day <= SEED_THROUGH_DAY)

  // Walk backwards from today, mostly a day at a time, occasionally slipping.
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 246)

  const records: ProgressRecord[] = []
  const wantsPhoto: string[] = []

  for (const day of days) {
    const at = new Date(cursor)
    at.setHours(18 + Math.floor(rand() * 5), Math.floor(rand() * 60))

    let status: ProgressRecord['status']
    if (day.isRest) {
      status = 'rest'
    } else if (day.day > 126 && day.day < 140) {
      status = rand() < 0.78 ? 'skipped' : 'minimum'   // the bad fortnight
    } else {
      const r = rand()
      status = r < 0.62 ? 'full' : r < 0.88 ? 'minimum' : 'skipped'
    }

    const worked = status === 'full' || status === 'minimum'
    if (opts.withPhotos && worked && rand() < 0.42) wantsPhoto.push(day.dayId)

    records.push({
      dayId: day.dayId,
      day: day.day,
      type: day.type,
      status,
      completedAt: at.toISOString(),
      planDate: planDate(at, settings.dayBoundaryHour),
      actualTime: worked ? BUCKETS[Math.floor(rand() * 4)] : null,
      note: worked && rand() < 0.4 ? NOTES[Math.floor(rand() * NOTES.length)] : '',
      photoIds: [],
      swappedFor: null,
      seed: true,
    })

    // Most days advance one calendar day; sometimes life gets in the way.
    cursor.setDate(cursor.getDate() + (rand() < 0.82 ? 1 : rand() < 0.7 ? 2 : 3))
  }

  // Days go in first, in one transaction. Drawing 80-odd fake sketches takes
  // half a minute, and the app should be usable the whole time rather than
  // sitting at zero until the last photo lands.
  const tx = database.transaction('progress', 'readwrite')
  for (const record of records) await tx.store.put(record)
  await tx.done
  opts.onProgress?.(records.length, records.length, 'days')

  let photos = 0
  for (const dayId of wantsPhoto) {
    const blob = await fakePhotoBlob(rand)
    if (!blob) break                       // headless: no canvas, no photos
    const id = randomId()
    const createdAt = records.find((r) => r.dayId === dayId)!.completedAt
    await database.put('photos', {
      id, dayId, createdAt, blob,
      width: 240, height: 320, bytes: blob.size,
      remotePath: null, uploadState: 'local', seed: true,
    })
    const record = await database.get('progress', dayId)
    if (record) await database.put('progress', { ...record, photoIds: [...record.photoIds, id] })
    photos++
    opts.onProgress?.(photos, wantsPhoto.length, 'photos')
  }

  await saveSettings({
    seeded: true,
    completedSinceExport: records.filter((r) => r.status !== 'rest' && r.status !== 'skipped').length,
    lastExportAt: null,
  })
  return { days: records.length, photos }
}

export async function clearDemoData(): Promise<SeedReport> {
  const database = await db()
  const progress = await database.getAll('progress')
  const photos = await database.getAll('photos')
  const seededDays = progress.filter((r) => r.seed === true)
  const seededPhotos = photos.filter((p) => p.seed === true)

  const tx = database.transaction(['progress', 'photos'], 'readwrite')
  for (const r of seededDays) await tx.objectStore('progress').delete(r.dayId)
  for (const p of seededPhotos) await tx.objectStore('photos').delete(p.id)
  await tx.done

  await saveSettings({ seeded: false, completedSinceExport: 0 })
  return { days: seededDays.length, photos: seededPhotos.length }
}

export function todayISO(): string {
  return toISODate(new Date())
}
