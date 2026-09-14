import type { Curriculum, CurriculumDay, ProgressRecord, Settings } from './types'
import { daysSince } from './time'

export interface OrphanedRecord {
  record: ProgressRecord
  reason: 'no-such-day'
}

export interface PlanState {
  /** The day to show. Null only when all 365 are behind you. */
  today: CurriculumDay | null
  completed: number
  /** full + minimum. Rest and skipped are not achievements. */
  worked: number
  streak: number
  graceUsed: number
  graceRemaining: number
  /** Records whose dayId is no longer in the curriculum. Kept, never dropped. */
  orphaned: OrphanedRecord[]
  /** Plan days since the last full/minimum completion, for the re-entry flow. */
  daysSinceLastWorked: number | null
  needsReEntry: boolean
  backupPrompt: 'none' | 'count' | 'age'
}

/**
 * The plan advances on completion, never on the calendar. The next day is
 * simply the lowest-numbered day with no record against its dayId — so two
 * weeks away produces one next task, not fourteen overdue ones.
 */
export function nextDay(
  curriculum: Curriculum,
  progress: Map<string, ProgressRecord>,
): CurriculumDay | null {
  for (const day of curriculum.days) {
    if (!progress.has(day.dayId)) return day
  }
  return null
}

/**
 * Streak tolerates misses. Walking back from the most recent record, a skip
 * keeps the streak alive while grace covers it. There is no concept of a
 * missed day here at all — only of a day recorded as skipped.
 */
export function computeStreak(records: ProgressRecord[], graceBudget: number): number {
  let streak = 0
  let skipsSeen = 0
  for (let i = records.length - 1; i >= 0; i--) {
    const status = records[i].status
    if (status === 'full' || status === 'minimum' || status === 'rest') {
      streak++
    } else if (status === 'skipped') {
      skipsSeen++
      if (skipsSeen > graceBudget) break
      streak++
    }
  }
  return streak
}

/** Skips inside the trailing window, measured in plan days rather than clock
 *  days — the plan is completion-paced, so the window has to be too. */
export function graceUsed(records: ProgressRecord[], windowDays: number): number {
  const window = records.slice(-windowDays)
  return window.filter((r) => r.status === 'skipped').length
}

export function planState(
  curriculum: Curriculum,
  records: ProgressRecord[],
  settings: Settings,
  now = new Date(),
): PlanState {
  const byId = new Map(records.map((r) => [r.dayId, r]))
  const known = new Set(curriculum.days.map((d) => d.dayId))
  const orphaned: OrphanedRecord[] = records
    .filter((r) => !known.has(r.dayId))
    .map((record) => ({ record, reason: 'no-such-day' as const }))

  const live = records.filter((r) => known.has(r.dayId))
  const worked = live.filter((r) => r.status === 'full' || r.status === 'minimum').length
  const used = graceUsed(live, settings.graceWindowDays)

  const lastWorked = [...live].reverse()
    .find((r) => r.status === 'full' || r.status === 'minimum')
  const since = lastWorked ? daysSince(lastWorked.completedAt, now) : null

  const sinceExport = daysSince(settings.lastExportAt, now)
  const backupPrompt: PlanState['backupPrompt'] =
    settings.completedSinceExport >= 30 ? 'count'
      : settings.lastExportAt === null && worked > 0 ? 'count'
        : sinceExport !== null && sinceExport >= 45 ? 'age'
          : 'none'

  return {
    today: nextDay(curriculum, byId),
    completed: live.length,
    worked,
    streak: computeStreak(live, settings.graceBudget),
    graceUsed: used,
    graceRemaining: Math.max(0, settings.graceBudget - used),
    orphaned,
    daysSinceLastWorked: since,
    // Skill decays, and the first day back is when people quit for good.
    needsReEntry: since !== null && since > 10,
    backupPrompt,
  }
}

export interface SwapResult {
  /** The lighter task to do instead. */
  substitute: CurriculumDay
  /** The day that got pushed forward. */
  deferred: CurriculumDay
}

/**
 * "Not this one today" — swap in a lighter task of a DIFFERENT activity type
 * from the same phase, so one unappealing task never becomes a three-day gap.
 */
export function findSwap(
  curriculum: Curriculum,
  progress: Map<string, ProgressRecord>,
  deferred: CurriculumDay,
): SwapResult | null {
  const candidates = curriculum.days.filter(
    (d) =>
      d.phase === deferred.phase &&
      d.day > deferred.day &&
      d.type !== deferred.type &&
      !d.isRest &&
      !d.isProjectBlock &&
      !progress.has(d.dayId),
  )
  if (candidates.length === 0) return null
  // Lighter than the one being deferred, and the nearest such day.
  const lighter = candidates.filter((d) => d.minutes <= deferred.minutes)
  const substitute = (lighter.length ? lighter : candidates)[0]
  return { substitute, deferred }
}

export function swapsUsedThisWeek(records: ProgressRecord[], week: number): number {
  return records.filter((r) => r.swappedFor !== null && weekOf(r.day) === week).length
}

export function weekOf(day: number): number {
  return Math.floor((day - 1) / 7) + 1
}
