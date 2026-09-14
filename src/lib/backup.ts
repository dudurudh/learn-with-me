import { db, getSettings, saveSettings } from './db'
import type { PhotoRecord, ProgressRecord, ResourceState, Settings } from './types'

export const EXPORT_VERSION = 1

/** Photos are the bulk of the data. Past this, the JSON stops being a thing a
 *  browser can hold in memory, so we export without them and say so. */
const PHOTO_BUDGET_BYTES = 40 * 1024 * 1024

export interface ExportFile {
  app: 'learn-with-me'
  exportVersion: number
  exportedAt: string
  device: { id: string; name: string }
  counts: { progress: number; resources: number; photos: number }
  photosIncluded: boolean
  photosOmittedReason?: string
  settings: Omit<Settings, 'gistToken' | 'githubToken'>
  progress: ProgressRecord[]
  resources: ResourceState[]
  photos: { id: string; dayId: string; createdAt: string; dataUrl: string }[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function buildExport(includePhotos = true): Promise<ExportFile> {
  const database = await db()
  const settings = await getSettings()
  const progress = (await database.getAll('progress')).sort((a, b) => a.day - b.day)
  const resources = await database.getAll('resources')
  const photoRecords = await database.getAll('photos')

  // Tokens are deliberately not exported. A backup file is the thing most
  // likely to be emailed to yourself or dropped in a shared folder.
  const { gistToken: _g, githubToken: _t, ...safeSettings } = settings

  const totalBytes = photoRecords.reduce((n, p) => n + p.bytes, 0)
  let photos: ExportFile['photos'] = []
  let photosIncluded = false
  let reason: string | undefined

  if (!includePhotos) {
    reason = 'Excluded at your request.'
  } else if (totalBytes > PHOTO_BUDGET_BYTES) {
    reason = `${(totalBytes / 1024 / 1024).toFixed(0)} MB of photos is too much for one JSON file. `
      + 'Push them to the repo instead, or export photos separately.'
  } else {
    photos = await Promise.all(
      photoRecords.map(async (p: PhotoRecord) => ({
        id: p.id, dayId: p.dayId, createdAt: p.createdAt,
        dataUrl: await blobToDataUrl(p.blob),
      })),
    )
    photosIncluded = true
  }

  return {
    app: 'learn-with-me',
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    device: { id: settings.deviceId, name: settings.deviceName },
    counts: { progress: progress.length, resources: resources.length, photos: photoRecords.length },
    photosIncluded,
    ...(reason ? { photosOmittedReason: reason } : {}),
    settings: safeSettings,
    progress,
    resources,
    photos,
  }
}

export async function exportToFile(includePhotos = true): Promise<ExportFile> {
  const data = await buildExport(includePhotos)
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `learn-with-me-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  await saveSettings({ lastExportAt: data.exportedAt, completedSinceExport: 0 })
  return data
}

export interface ImportReport {
  progressAdded: number
  progressReplaced: number
  progressKept: number
  resourcesWritten: number
  photosWritten: number
  settingsApplied: boolean
  fromDevice: string
}

export type ImportMode = 'replace' | 'merge'

export function parseExport(text: string): ExportFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const data = parsed as Partial<ExportFile>
  if (data.app !== 'learn-with-me') {
    throw new Error('That file was not exported by this app.')
  }
  if (typeof data.exportVersion !== 'number' || data.exportVersion > EXPORT_VERSION) {
    throw new Error(
      `That file is export version ${String(data.exportVersion)}, newer than this app understands.`,
    )
  }
  if (!Array.isArray(data.progress)) throw new Error('That file has no progress records in it.')
  return data as ExportFile
}

/**
 * `replace` wipes local progress first. `merge` keeps whichever record was
 * completed later per dayId — so importing your phone's backup onto your
 * laptop never silently destroys a day only the laptop knows about.
 */
export async function importExport(data: ExportFile, mode: ImportMode): Promise<ImportReport> {
  const database = await db()
  const report: ImportReport = {
    progressAdded: 0, progressReplaced: 0, progressKept: 0,
    resourcesWritten: 0, photosWritten: 0, settingsApplied: false,
    fromDevice: data.device?.name ?? 'unknown device',
  }

  const tx = database.transaction('progress', 'readwrite')
  if (mode === 'replace') await tx.store.clear()
  for (const incoming of data.progress) {
    const existing = mode === 'merge' ? await tx.store.get(incoming.dayId) : undefined
    if (!existing) {
      await tx.store.put(incoming)
      report.progressAdded++
    } else if (Date.parse(incoming.completedAt) > Date.parse(existing.completedAt)) {
      await tx.store.put(incoming)
      report.progressReplaced++
    } else {
      report.progressKept++
    }
  }
  await tx.done

  for (const resource of data.resources ?? []) {
    await database.put('resources', resource)
    report.resourcesWritten++
  }

  for (const photo of data.photos ?? []) {
    const blob = await dataUrlToBlob(photo.dataUrl)
    await database.put('photos', {
      id: photo.id, dayId: photo.dayId, createdAt: photo.createdAt,
      blob, width: 0, height: 0, bytes: blob.size,
      remotePath: null, uploadState: 'local',
    })
    report.photosWritten++
  }

  // Keep this device's own identity and its secrets; take the rest.
  if (data.settings) {
    const current = await getSettings()
    const { deviceId: _i, deviceName: _n, ...incoming } = data.settings
    await saveSettings({ ...incoming, deviceId: current.deviceId, deviceName: current.deviceName })
    report.settingsApplied = true
  }
  return report
}
