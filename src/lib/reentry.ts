import type { Curriculum, CurriculumDay, ProgressRecord } from './types'
import { toISODate } from './time'

export const RE_ENTRY_PREFIX = 'reentry-'

export function isReEntryId(dayId: string): boolean {
  return dayId.startsWith(RE_ENTRY_PREFIX)
}

/**
 * Skill decays, and the first day back is when people quit for good. So after
 * more than ten days away the next thing you see is not day 143 — it is the
 * warm-up plus one drill you have already done, ten minutes, and it counts as
 * a full day. Coming back should feel easy, never like settling a debt.
 */
export function buildReEntryDay(
  curriculum: Curriculum,
  records: ProgressRecord[],
  next: CurriculumDay,
  now = new Date(),
): CurriculumDay {
  const done = new Set(records.map((r) => r.dayId))
  // A drill from a phase already behind you — familiar, not a test.
  const candidates = curriculum.days.filter(
    (d) => d.phase < next.phase && d.type === 'sketch' && !d.isRest && done.has(d.dayId),
  )
  const drill = candidates.length
    ? candidates[Math.floor(candidates.length / 2)]
    : curriculum.days[1]

  return {
    dayId: `${RE_ENTRY_PREFIX}${toISODate(now)}`,
    day: next.day,
    phase: next.phase,
    week: next.week,
    type: 'review',
    title: 'Coming back',
    full:
      'The warm-up, and one drill you have done before. One page of straight lines, one page '
      + `of ellipses on varying minor axes. Then ten minutes of this, from day ${drill.day}: `
      + `${drill.minimum}`,
    minimum: 'The warm-up only. One page of lines, one page of ellipses. Five minutes.',
    question: 'What went first — the lines, the ellipses, or the wanting to?',
    minutes: 15,
    resource: null,
    resourceMode: null,
    isProjectBlock: false,
    isRest: false,
    isBenchmark: false,
    isDeload: false,
  }
}
