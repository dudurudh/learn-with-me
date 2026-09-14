import { db, randomId, getSettings, saveSettings } from './db'
import { compressForStorage } from './images'
import { remotePathFor, flushUploadQueue } from './upload'
import { photosForDay } from './photos'
import type { CurriculumDay, PhotoRecord } from './types'

export interface AddedPhoto {
  record: PhotoRecord
  originalBytes: number
}

/**
 * Local first, always. The compression and the IndexedDB write happen before
 * anything touches the network, so adding a photo works on a train.
 */
export async function addPhotoToDay(day: CurriculumDay, file: File): Promise<AddedPhoto> {
  const compressed = await compressForStorage(file)
  const existing = await photosForDay(day.dayId)
  const record: PhotoRecord = {
    id: randomId(),
    dayId: day.dayId,
    createdAt: new Date().toISOString(),
    blob: compressed.blob,
    width: compressed.width,
    height: compressed.height,
    bytes: compressed.bytes,
    remotePath: remotePathFor(day.day, existing.length),
    uploadState: 'local',
  }

  const database = await db()
  await database.put('photos', record)

  const progress = await database.get('progress', day.dayId)
  if (progress && !progress.photoIds.includes(record.id)) {
    await database.put('progress', { ...progress, photoIds: [...progress.photoIds, record.id] })
  }

  // Fire and forget. A failure leaves the photo queued, never lost.
  void flushUploadQueue().catch(() => undefined)

  return { record, originalBytes: compressed.originalBytes }
}

export async function deletePhoto(id: string): Promise<void> {
  const database = await db()
  const photo = await database.get('photos', id)
  await database.delete('photos', id)
  if (photo) {
    const progress = await database.get('progress', photo.dayId)
    if (progress) {
      await database.put('progress', {
        ...progress,
        photoIds: progress.photoIds.filter((p) => p !== id),
      })
    }
  }
}

/** Shown once, on the first photo, and then never again. */
export async function shouldWarnAboutPublicPhotos(): Promise<boolean> {
  const settings = await getSettings()
  return !settings.publicPhotoWarningSeen
}

export async function markPublicPhotoWarningSeen(): Promise<void> {
  await saveSettings({ publicPhotoWarningSeen: true })
}
