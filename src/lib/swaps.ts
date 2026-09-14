import { db } from './db'
import type { Curriculum, CurriculumDay } from './types'

export interface Swap {
  /** The day you did not want today. */
  deferredId: string
  /** The lighter day that took its place. */
  substituteId: string
  at: string
  /** Curriculum week the swap was spent in, for the weekly cap. */
  week: number
}

export async function getSwaps(): Promise<Swap[]> {
  return ((await (await db()).get('kv', 'swaps')) as Swap[] | undefined) ?? []
}

export async function addSwap(swap: Swap): Promise<Swap[]> {
  const next = [...(await getSwaps()), swap]
  await (await db()).put('kv', next, 'swaps')
  return next
}

export async function clearSwaps(): Promise<void> {
  await (await db()).put('kv', [], 'swaps')
}

/**
 * The running order of the year. Deferring a day exchanges its position with
 * the substitute's, so "not this one today" moves the task to the next slot of
 * a comparable kind rather than deleting it or leaving a hole.
 */
export function orderedDays(curriculum: Curriculum, swaps: Swap[], floorDay = 1): CurriculumDay[] {
  const order = curriculum.days.filter((d) => d.day >= floorDay)
  const index = new Map(order.map((d, i) => [d.dayId, i]))
  for (const swap of swaps) {
    const a = index.get(swap.deferredId)
    const b = index.get(swap.substituteId)
    if (a === undefined || b === undefined) continue   // a hand-edit removed one
    ;[order[a], order[b]] = [order[b], order[a]]
    index.set(swap.deferredId, b)
    index.set(swap.substituteId, a)
  }
  return order
}

export function swapsUsedInWeek(swaps: Swap[], week: number): number {
  return swaps.filter((s) => s.week === week).length
}
