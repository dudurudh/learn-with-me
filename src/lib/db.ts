import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PhotoRecord, ProgressRecord, ResourceState, Settings } from './types'

const DB_NAME = 'learn-with-me'
const DB_VERSION = 1

interface Schema extends DBSchema {
  progress: { key: string; value: ProgressRecord; indexes: { day: number } }
  photos: { key: string; value: PhotoRecord; indexes: { dayId: string } }
  resources: { key: string; value: ResourceState }
  kv: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

export function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const progress = database.createObjectStore('progress', { keyPath: 'dayId' })
        progress.createIndex('day', 'day')
        const photos = database.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('dayId', 'dayId')
        database.createObjectStore('resources', { keyPath: 'id' })
        database.createObjectStore('kv')
      },
    })
  }
  return dbPromise
}

/** Test hook: forget the cached handle so a fresh open re-reads from disk. */
export function resetDbHandle() {
  dbPromise = null
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const DEFAULT_SETTINGS: Omit<Settings, 'deviceId' | 'deviceName'> = {
  dayBoundaryHour: 4,
  graceBudget: 2,
  graceWindowDays: 14,
  floorDay: 1,
  swapsPerWeek: 2,
  reminderTime: '19:30',
  newsGatedUntilComplete: true,
  lastExportAt: null,
  completedSinceExport: 0,
  seeded: false,
  ntfyTopic: '',
  gistToken: '',
  gistId: '',
  gistAutoSync: true,
  lastSyncAt: null,
  githubToken: '',
  githubRepo: '',
  publicPhotoWarningSeen: false,
  deadlines: [],
}

function guessDeviceName(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android phone'
  if (/Mac OS X/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  return 'This device'
}

export async function getSettings(): Promise<Settings> {
  const database = await db()
  const stored = (await database.get('kv', 'settings')) as Partial<Settings> | undefined
  // Merge rather than replace, so a settings key added in a later release
  // appears with its default instead of as undefined.
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    deviceId: randomId(),
    deviceName: guessDeviceName(),
    ...(stored ?? {}),
  }
  if (!stored) await database.put('kv', settings, 'settings')
  return settings
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  const database = await db()
  await database.put('kv', next, 'settings')
  return next
}
