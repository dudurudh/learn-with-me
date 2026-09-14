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

/** `skill` runs 0 to 1. Early drawings wobble and overshoot; later ones are
 *  steadier and better composed — otherwise the demo's benchmark series shows
 *  a year of identical scribbles and proves nothing. */
async function fakePhotoBlob(rand: () => number, skill = 0.4): Promise<Blob | null> {
  // Browser only. Tests run headless and skip photo generation entirely.
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#F5F2EC'
  ctx.fillRect(0, 0, 240, 320)
  ctx.strokeStyle = `rgba(34,32,29,${0.45 + skill * 0.35})`
  // A tighter margin and less stray ink as skill goes up.
  const pad = 24 + skill * 34
  const stray = Math.round(26 * (1 - skill) + 6)
  for (let i = 0; i < stray; i++) {
    ctx.lineWidth = 0.4 + rand() * (1.8 - skill)
    ctx.beginPath()
    ctx.moveTo(rand() * 240, rand() * 320)
    ctx.lineTo(rand() * 240, rand() * 320)
    ctx.stroke()
  }
  // A rough object, drawn straighter and more deliberately with practice.
  const w = 240 - pad * 2
  const h = 320 - pad * 2
  const jitter = (1 - skill) * 16
  ctx.lineWidth = 1 + skill * 1.4
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(pad + rand() * jitter, pad + (h / 4) * i + rand() * jitter)
    ctx.lineTo(pad + w + rand() * jitter, pad + (h / 4) * i + rand() * jitter)
    ctx.stroke()
  }
  for (let i = 0; i < 3 + Math.round(skill * 3); i++) {
    ctx.lineWidth = 0.7 + skill
    ctx.beginPath()
    ctx.ellipse(
      120 + (rand() - 0.5) * jitter * 2,
      pad + 30 + i * (h / 5),
      w / 2 - rand() * jitter, 10 + skill * 14,
      (rand() - 0.5) * (1 - skill), 0, Math.PI * 2,
    )
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

  // Work out the gaps first, then start far enough back that the last seeded
  // day lands on today. Otherwise the demo log carries dates in the future,
  // which is both wrong and quietly confusing.
  const gaps = days.map(() => (rand() < 0.82 ? 1 : rand() < 0.7 ? 2 : 3))
  const span = gaps.slice(0, -1).reduce((a, b) => a + b, 0)
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - span)

  const records: ProgressRecord[] = []
  const wantsPhoto: string[] = []

  const now = Date.now()
  days.forEach((day, i) => {
    const at = new Date(cursor)
    at.setHours(18 + Math.floor(rand() * 5), Math.floor(rand() * 60))
    // Evenings are the plausible hour, but the last day is today and its
    // evening may not have happened yet.
    if (at.getTime() > now) at.setTime(now)

    let status: ProgressRecord['status']
    if (day.isRest) {
      status = 'rest'
    } else if (day.isBenchmark) {
      status = 'full'
    } else if (day.day > 126 && day.day < 140) {
      status = rand() < 0.78 ? 'skipped' : 'minimum'   // the bad fortnight
    } else {
      const r = rand()
      status = r < 0.62 ? 'full' : r < 0.88 ? 'minimum' : 'skipped'
    }

    const worked = status === 'full' || status === 'minimum'
    // A benchmark day always gets a photo: the Series screen is the whole
    // point of the demo, and it is useless with five empty frames.
    if (opts.withPhotos && (day.isBenchmark || (worked && rand() < 0.42))) {
      wantsPhoto.push(day.dayId)
    }

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
    cursor.setDate(cursor.getDate() + gaps[i])
  })

  // Days go in first, in one transaction. Drawing 80-odd fake sketches takes
  // half a minute, and the app should be usable the whole time rather than
  // sitting at zero until the last photo lands.
  const tx = database.transaction('progress', 'readwrite')
  for (const record of records) await tx.store.put(record)
  await tx.done
  opts.onProgress?.(records.length, records.length, 'days')

  let photos = 0
  const dayNumber = new Map(days.map((d) => [d.dayId, d.day]))
  for (const dayId of wantsPhoto) {
    // Skill ramps across the seeded stretch.
    const skill = Math.min(1, (dayNumber.get(dayId) ?? 1) / SEED_THROUGH_DAY)
    const blob = await fakePhotoBlob(rand, 0.15 + skill * 0.75)
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
