import { db, getSettings, saveSettings } from './db'
import { planDate } from './time'
import type {
  ActivityType, CurriculumDay, DayStatus, ProgressRecord,
  ResourceState, Holding, ResourceProgress, TimeBucket,
} from './types'

export async function allProgress(): Promise<ProgressRecord[]> {
  const records = await (await db()).getAll('progress')
  return records.sort((a, b) => a.day - b.day)
}

export async function progressMap(): Promise<Map<string, ProgressRecord>> {
  return new Map((await allProgress()).map((r) => [r.dayId, r]))
}

export interface MarkInput {
  status: DayStatus
  actualTime?: TimeBucket | null
  note?: string
  photoIds?: string[]
  swappedFor?: string | null
  at?: Date
}

/**
 * Write-through: the record hits IndexedDB before any caller updates React
 * state. Nothing about a completed day should exist only in memory.
 */
export async function markDay(day: CurriculumDay, input: MarkInput): Promise<ProgressRecord> {
  const settings = await getSettings()
  const at = input.at ?? new Date()
  const record: ProgressRecord = {
    dayId: day.dayId,
    day: day.day,
    type: day.type,
    status: input.status,
    completedAt: at.toISOString(),
    planDate: planDate(at, settings.dayBoundaryHour),
    actualTime: input.actualTime ?? null,
    note: input.note ?? '',
    photoIds: input.photoIds ?? [],
    swappedFor: input.swappedFor ?? null,
  }
  await (await db()).put('progress', record)
  if (input.status === 'full' || input.status === 'minimum') {
    await saveSettings({ completedSinceExport: settings.completedSinceExport + 1 })
  }
  return record
}

export async function unmarkDay(dayId: string): Promise<void> {
  await (await db()).delete('progress', dayId)
}

// ── Resource holding state ────────────────────────────────────────────
// `cost` (free/paid) is a fact about the resource and lives in the
// curriculum. Whether you own it, borrowed it, or still need it is yours,
// so it lives here and travels in the export.

export async function allResourceStates(): Promise<Map<string, ResourceState>> {
  const rows = await (await db()).getAll('resources')
  return new Map(rows.map((r) => [r.id, r]))
}

export async function getResourceState(id: string): Promise<ResourceState> {
  const existing = await (await db()).get('resources', id)
  return existing ?? { id, holding: 'none', progress: 'unstarted', dueBack: null }
}

export async function setResourceState(
  id: string,
  patch: Partial<Pick<ResourceState, 'holding' | 'progress' | 'dueBack'>>,
): Promise<ResourceState> {
  const next = { ...(await getResourceState(id)), ...patch }
  // A due-back date only means anything while the book is actually borrowed.
  if (next.holding !== 'borrowed') next.dueBack = null
  await (await db()).put('resources', next)
  return next
}

export function holdingLabel(h: Holding): string {
  return h === 'owned' ? 'Owned' : h === 'borrowed' ? 'Borrowed' : 'Not yet'
}

export function resourceProgressLabel(p: ResourceProgress): string {
  return p === 'active' ? 'Reading' : p === 'done' ? 'Finished'
    : p === 'notInterested' ? 'Not for me' : 'Not started'
}

export const ACTIVITY_TYPES: ActivityType[] =
  ['sketch', 'watch', 'read', 'cad', 'make', 'review', 'rest']
