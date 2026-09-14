import type {
  ActivityType, Curriculum, Deadline, ProgressRecord, TimeBucket,
} from './types'
import { daysBetween, toISODate } from './time'

/** Midpoints for the four buckets. Rough on purpose — the point is spotting a
 *  25-minute task that actually takes 45, not measuring to the minute. */
export const BUCKET_MINUTES: Record<TimeBucket, number> = {
  under10: 7, '10to20': 15, '20to40': 30, '40plus': 50,
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface Drift {
  type: ActivityType
  samples: number
  estimated: number | null
  actual: number | null
  /** Positive means it runs longer than the plan claims. */
  gapPercent: number | null
  overrunning: boolean
}

/**
 * The curriculum is a guess. If Tuesdays consistently run 45 minutes against a
 * 25-minute estimate, the plan is wrong and wants cutting, not pushing through.
 */
export function driftByType(curriculum: Curriculum, records: ProgressRecord[]): Drift[] {
  const minutesById = new Map(curriculum.days.map((d) => [d.dayId, d.minutes]))
  const byType = new Map<ActivityType, { est: number[]; act: number[] }>()

  for (const record of records) {
    if (!record.actualTime) continue
    const estimated = minutesById.get(record.dayId)
    if (estimated === undefined) continue
    const bucket = byType.get(record.type) ?? { est: [], act: [] }
    bucket.est.push(estimated)
    bucket.act.push(BUCKET_MINUTES[record.actualTime])
    byType.set(record.type, bucket)
  }

  return [...byType.entries()]
    .map(([type, { est, act }]) => {
      const estimated = median(est)
      const actual = median(act)
      const gapPercent =
        estimated && actual ? Math.round(((actual - estimated) / estimated) * 100) : null
      return {
        type,
        samples: act.length,
        estimated,
        actual,
        gapPercent,
        // Five samples is not proof, but it is enough to stop guessing.
        overrunning: gapPercent !== null && gapPercent > 50 && act.length >= 5,
      }
    })
    .sort((a, b) => (b.gapPercent ?? 0) - (a.gapPercent ?? 0))
}

export interface TypeRate {
  type: ActivityType
  attempted: number
  worked: number
  skipped: number
  rate: number
  /** Below 40% over the window: worth knowing at day 60, not day 300. */
  falling: boolean
}

/**
 * Not just how often you skip but WHAT. Silently dropping 80% of `make` days
 * while doing every sketch day is the kind of thing that only becomes obvious
 * far too late.
 */
export function skipRates(records: ProgressRecord[], windowSize = 30): TypeRate[] {
  const window = records.slice(-windowSize).filter((r) => r.type !== 'rest')
  const byType = new Map<ActivityType, { worked: number; skipped: number }>()

  for (const record of window) {
    const bucket = byType.get(record.type) ?? { worked: 0, skipped: 0 }
    if (record.status === 'skipped') bucket.skipped++
    else bucket.worked++
    byType.set(record.type, bucket)
  }

  return [...byType.entries()]
    .map(([type, { worked, skipped }]) => {
      const attempted = worked + skipped
      const rate = attempted === 0 ? 1 : worked / attempted
      return {
        type, attempted, worked, skipped,
        rate,
        falling: attempted >= 3 && rate < 0.4,
      }
    })
    .sort((a, b) => a.rate - b.rate)
}

export interface Projection {
  daysPerWeek: number | null
  remaining: number
  projectedFinish: string | null
  elapsedCalendarDays: number
}

/**
 * Projected finish from the rate you actually work at, not from the calendar.
 * This is the number that should make you adjust.
 */
export function project(records: ProgressRecord[], totalDays = 365, now = new Date()): Projection {
  const done = records.length
  const remaining = Math.max(0, totalDays - done)
  if (done < 7) {
    return { daysPerWeek: null, remaining, projectedFinish: null, elapsedCalendarDays: 0 }
  }
  const first = records[0].planDate
  const last = records[records.length - 1].planDate
  const elapsed = Math.max(1, daysBetween(first, last) + 1)
  const perDay = done / elapsed
  const daysPerWeek = Math.round(perDay * 7 * 10) / 10
  const finish = new Date(now)
  finish.setDate(finish.getDate() + Math.ceil(remaining / perDay))
  return {
    daysPerWeek,
    remaining,
    projectedFinish: toISODate(finish),
    elapsedCalendarDays: elapsed,
  }
}

export interface DeadlineView extends Deadline {
  daysLeft: number
  /** The one place the app is allowed to be a little insistent. */
  urgent: boolean
  finishesBefore: boolean | null
}

export function deadlineViews(
  deadlines: Deadline[],
  projectedFinish: string | null,
  now = new Date(),
): DeadlineView[] {
  const today = toISODate(now)
  return deadlines
    .map((d) => {
      const daysLeft = daysBetween(today, d.date)
      return {
        ...d,
        daysLeft,
        urgent: daysLeft >= 0 && daysLeft <= 60,
        finishesBefore: projectedFinish ? daysBetween(projectedFinish, d.date) >= 0 : null,
      }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export function phaseProgress(curriculum: Curriculum, records: ProgressRecord[], phase: number) {
  const days = curriculum.days.filter((d) => d.phase === phase)
  const done = new Set(records.map((r) => r.dayId))
  const completed = days.filter((d) => done.has(d.dayId)).length
  return { completed, total: days.length, fraction: days.length ? completed / days.length : 0 }
}
