import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

import { db, getSettings, saveSettings, resetDbHandle } from '../db'
import { allProgress, markDay, setResourceState, getResourceState } from '../progress'
import { planState, computeStreak, graceUsed, findSwap, nextDay } from '../plan'
import { buildExport, importExport, parseExport } from '../backup'
import { seedDemoData, clearDemoData, SEED_THROUGH_DAY } from '../seed'
import { planDate } from '../time'
import type { Curriculum, ProgressRecord } from '../types'

const curriculum: Curriculum = JSON.parse(
  readFileSync(new URL('../../../public/curriculum.json', import.meta.url), 'utf8'),
)

/** Wipes the backing store the way a fresh browser profile would. */
async function freshDb() {
  indexedDB = new IDBFactory()
  resetDbHandle()
  await db()
}

/** Closes the handle and reopens, which is what a hard refresh does. */
async function hardRefresh() {
  ;(await db()).close()
  resetDbHandle()
  await db()
}

const rec = (over: Partial<ProgressRecord>): ProgressRecord => ({
  dayId: 'x', day: 1, type: 'sketch', status: 'full',
  completedAt: '2026-01-01T20:00:00.000Z', planDate: '2026-01-01',
  actualTime: null, note: '', photoIds: [], swappedFor: null, ...over,
})

beforeEach(freshDb)

describe('curriculum file', () => {
  it('is the full year with unique, stable ids', () => {
    expect(curriculum.days).toHaveLength(365)
    expect(new Set(curriculum.days.map((d) => d.dayId)).size).toBe(365)
    expect(curriculum.days.map((d) => d.day)).toEqual(
      Array.from({ length: 365 }, (_, i) => i + 1),
    )
  })
})

describe('the day boundary', () => {
  it('puts a 00:20 session on the day it felt like', () => {
    expect(planDate(new Date(2026, 8, 14, 0, 20), 4)).toBe('2026-09-13')
    expect(planDate(new Date(2026, 8, 13, 23, 30), 4)).toBe('2026-09-13')
    expect(planDate(new Date(2026, 8, 14, 4, 1), 4)).toBe('2026-09-14')
  })

  it('behaves like midnight when the boundary is set to 0', () => {
    expect(planDate(new Date(2026, 8, 14, 0, 20), 0)).toBe('2026-09-14')
  })
})

describe('the plan advances on completion, not the calendar', () => {
  it('serves day 4 after three days, no matter how long ago they were', async () => {
    for (let i = 0; i < 3; i++) {
      await markDay(curriculum.days[i], {
        status: 'full',
        at: new Date(Date.now() - 90 * 86_400_000),
      })
    }
    const state = planState(curriculum, await allProgress(), await getSettings())
    expect(state.today?.day).toBe(4)
    expect(state.completed).toBe(3)
  })

  it('never produces a backlog after a long absence', async () => {
    await markDay(curriculum.days[0], { status: 'full', at: new Date('2026-01-01') })
    const state = planState(curriculum, await allProgress(), await getSettings())
    // One next task. Not 250 overdue ones.
    expect(state.today?.day).toBe(2)
  })

  it('returns null once all 365 are behind you', () => {
    const all = new Map(curriculum.days.map((d) => [d.dayId, rec({ dayId: d.dayId })]))
    expect(nextDay(curriculum, all)).toBeNull()
  })
})

describe('streaks tolerate misses', () => {
  it('survives skips while grace covers them', () => {
    const records = [
      rec({ day: 1, status: 'full' }), rec({ day: 2, status: 'minimum' }),
      rec({ day: 3, status: 'skipped' }), rec({ day: 4, status: 'full' }),
    ]
    expect(computeStreak(records, 2)).toBe(4)
  })

  it('breaks only once grace is exhausted', () => {
    const records = [
      rec({ day: 1, status: 'full' }), rec({ day: 2, status: 'skipped' }),
      rec({ day: 3, status: 'skipped' }), rec({ day: 4, status: 'skipped' }),
    ]
    expect(computeStreak(records, 2)).toBe(2)
  })

  it('counts rest days as continuing the streak, never against it', () => {
    const records = [
      rec({ day: 1, status: 'full' }), rec({ day: 2, status: 'rest' }),
      rec({ day: 3, status: 'full' }),
    ]
    expect(computeStreak(records, 2)).toBe(3)
  })

  it('measures grace over a trailing window, so old skips expire', () => {
    const old = Array.from({ length: 14 }, (_, i) => rec({ day: i + 1, status: 'full' }))
    const records = [rec({ day: 0, status: 'skipped' }), ...old]
    expect(graceUsed(records, 14)).toBe(0)
  })
})

describe('editing curriculum.json does not corrupt progress', () => {
  it('keeps records whose dayId vanished, and flags them as orphaned', async () => {
    await markDay(curriculum.days[0], { status: 'full', note: 'the benchmark' })
    await markDay(curriculum.days[1], { status: 'full' })

    // Simulate hand-editing the file: one day deleted outright.
    const edited: Curriculum = { ...curriculum, days: curriculum.days.slice(1) }
    const state = planState(curriculum.days.slice(1) && edited, await allProgress(), await getSettings())

    expect(state.orphaned).toHaveLength(1)
    expect(state.orphaned[0].record.note).toBe('the benchmark')
    expect(await allProgress()).toHaveLength(2)   // nothing was dropped
  })

  it('slots a newly inserted day in without disturbing completed work', async () => {
    for (let i = 0; i < 5; i++) await markDay(curriculum.days[i], { status: 'full' })
    const inserted = { ...curriculum.days[9], dayId: 'p1-d003b-brand-new', day: 3 }
    const edited: Curriculum = {
      ...curriculum,
      days: [...curriculum.days.slice(0, 3), inserted, ...curriculum.days.slice(3)]
        .sort((a, b) => a.day - b.day),
    }
    const state = planState(edited, await allProgress(), await getSettings())
    expect(state.today?.dayId).toBe('p1-d003b-brand-new')
    expect(state.completed).toBe(5)
    expect(state.orphaned).toHaveLength(0)
  })

  it('survives a title being rewritten, because the key is the dayId', async () => {
    await markDay(curriculum.days[0], { status: 'full' })
    const edited: Curriculum = {
      ...curriculum,
      days: curriculum.days.map((d, i) => (i === 0 ? { ...d, title: 'Completely new title' } : d)),
    }
    const state = planState(edited, await allProgress(), await getSettings())
    expect(state.orphaned).toHaveLength(0)
    expect(state.today?.day).toBe(2)
  })
})

describe('a full year of seeded data survives a hard refresh', () => {
  it('writes 200 days and reads them back after the handle is closed', async () => {
    const report = await seedDemoData(curriculum)
    expect(report.days).toBe(SEED_THROUGH_DAY)

    await hardRefresh()

    const after = await allProgress()
    expect(after).toHaveLength(SEED_THROUGH_DAY)
    expect(after[0].day).toBe(1)
    expect(after[after.length - 1].day).toBe(SEED_THROUGH_DAY)
    const state = planState(curriculum, after, await getSettings())
    expect(state.today?.day).toBe(SEED_THROUGH_DAY + 1)
    expect(state.orphaned).toHaveLength(0)
  })

  it('holds all 365 days and still reads back correctly', async () => {
    for (const day of curriculum.days) {
      await markDay(day, { status: day.isRest ? 'rest' : 'full', note: 'n'.repeat(200) })
    }
    await hardRefresh()
    const after = await allProgress()
    expect(after).toHaveLength(365)
    expect(planState(curriculum, after, await getSettings()).today).toBeNull()
  })

  it('is one-click reversible and removes only seeded rows', async () => {
    await seedDemoData(curriculum)
    // A real day recorded on top of the demo history.
    const real = curriculum.days[SEED_THROUGH_DAY]
    await markDay(real, { status: 'full', note: 'mine' })

    const cleared = await clearDemoData()
    expect(cleared.days).toBe(SEED_THROUGH_DAY)

    const left = await allProgress()
    expect(left).toHaveLength(1)
    expect(left[0].note).toBe('mine')
    expect((await getSettings()).seeded).toBe(false)
  })

  it('refuses to seed on top of real work', async () => {
    await markDay(curriculum.days[0], { status: 'full', note: 'mine' })
    await expect(seedDemoData(curriculum)).rejects.toThrow(/real progress/i)
  })
})

describe('export and import', () => {
  it('round-trips progress through a hard refresh and a wipe', async () => {
    await seedDemoData(curriculum)
    await setResourceState('robertson-draw', { holding: 'borrowed', dueBack: '2026-10-01' })
    const file = await buildExport()
    expect(file.counts.progress).toBe(SEED_THROUGH_DAY)

    await freshDb()
    expect(await allProgress()).toHaveLength(0)

    const report = await importExport(parseExport(JSON.stringify(file)), 'replace')
    expect(report.progressAdded).toBe(SEED_THROUGH_DAY)
    await hardRefresh()
    expect(await allProgress()).toHaveLength(SEED_THROUGH_DAY)
    expect((await getResourceState('robertson-draw')).holding).toBe('borrowed')
  })

  it('never writes tokens into the backup file', async () => {
    await saveSettings({ githubToken: 'ghp_secret', gistToken: 'gist_secret' })
    const json = JSON.stringify(await buildExport())
    expect(json).not.toContain('ghp_secret')
    expect(json).not.toContain('gist_secret')
  })

  it('merging two devices keeps the later record and destroys nothing', async () => {
    // Laptop did days 1-3.
    for (let i = 0; i < 3; i++) {
      await markDay(curriculum.days[i], { status: 'full', at: new Date('2026-03-01T20:00:00Z') })
    }
    const laptop = await buildExport()

    // Phone did day 1 (later, with a note) and day 4, which the laptop never saw.
    await freshDb()
    await markDay(curriculum.days[0], {
      status: 'minimum', note: 'from the phone', at: new Date('2026-03-05T20:00:00Z'),
    })
    await markDay(curriculum.days[3], { status: 'full', at: new Date('2026-03-06T20:00:00Z') })

    const report = await importExport(parseExport(JSON.stringify(laptop)), 'merge')
    const merged = await allProgress()

    expect(merged).toHaveLength(4)                       // day 4 was not lost
    expect(report.progressKept).toBe(1)                  // day 1: phone's was newer
    expect(merged.find((r) => r.day === 1)?.note).toBe('from the phone')
    expect(merged.find((r) => r.day === 2)).toBeTruthy() // laptop-only days arrived
  })

  it('rejects a file from another app, and one from the future', () => {
    expect(() => parseExport('{"app":"something-else"}')).toThrow(/not exported by this app/i)
    expect(() => parseExport('{"app":"learn-with-me","exportVersion":99,"progress":[]}'))
      .toThrow(/newer than this app/i)
    expect(() => parseExport('not json at all')).toThrow(/not valid JSON/i)
  })
})

describe('nagging about backups', () => {
  it('asks after 30 completed days', async () => {
    await saveSettings({ completedSinceExport: 30, lastExportAt: new Date().toISOString() })
    const state = planState(curriculum, [rec({ status: 'full' })], await getSettings())
    expect(state.backupPrompt).toBe('count')
  })

  it('asks again when the last export is 45 days old', async () => {
    await saveSettings({
      completedSinceExport: 2,
      lastExportAt: new Date(Date.now() - 46 * 86_400_000).toISOString(),
    })
    const state = planState(curriculum, [rec({ status: 'full' })], await getSettings())
    expect(state.backupPrompt).toBe('age')
  })

  it('stays quiet when a backup is recent', async () => {
    await saveSettings({ completedSinceExport: 3, lastExportAt: new Date().toISOString() })
    expect(planState(curriculum, [rec({ status: 'full' })], await getSettings()).backupPrompt)
      .toBe('none')
  })
})

describe('re-entry after time away', () => {
  it('triggers past ten days, and not before', async () => {
    await markDay(curriculum.days[0], {
      status: 'full', at: new Date(Date.now() - 11 * 86_400_000),
    })
    const away = planState(curriculum, await allProgress(), await getSettings())
    expect(away.needsReEntry).toBe(true)
    expect(away.daysSinceLastWorked).toBe(11)

    await freshDb()
    await markDay(curriculum.days[0], {
      status: 'full', at: new Date(Date.now() - 3 * 86_400_000),
    })
    expect(planState(curriculum, await allProgress(), await getSettings()).needsReEntry).toBe(false)
  })
})

describe('not this one today', () => {
  it('substitutes a different activity type from the same phase', async () => {
    const deferred = curriculum.days.find((d) => d.day === 2)!
    const swap = findSwap(curriculum, new Map(), deferred)
    expect(swap).not.toBeNull()
    expect(swap!.substitute.type).not.toBe(deferred.type)
    expect(swap!.substitute.phase).toBe(deferred.phase)
    expect(swap!.substitute.isRest).toBe(false)
    expect(swap!.substitute.isProjectBlock).toBe(false)
  })

  it('never offers a day that is already done', async () => {
    const deferred = curriculum.days.find((d) => d.day === 2)!
    const done = new Map(
      curriculum.days.filter((d) => d.type === 'watch').map((d) => [d.dayId, rec({ dayId: d.dayId })]),
    )
    const swap = findSwap(curriculum, done, deferred)
    expect(swap!.substitute.type).not.toBe('watch')
  })
})

describe('write-through', () => {
  it('a marked day is on disk before anything reads it back', async () => {
    await markDay(curriculum.days[0], { status: 'minimum', note: 'ten minutes', actualTime: 'under10' })
    await hardRefresh()
    const [row] = await allProgress()
    expect(row.status).toBe('minimum')
    expect(row.note).toBe('ten minutes')
    expect(row.actualTime).toBe('under10')
    expect(row.day).toBe(1)
  })
})

describe('deferring a day', () => {
  it('exchanges its place with the substitute and loses nothing', async () => {
    const { orderedDays } = await import('../swaps')
    const deferred = curriculum.days.find((d) => d.day === 2)!
    const swap = findSwap(curriculum, new Map(), deferred)!
    const order = orderedDays(curriculum, [{
      deferredId: deferred.dayId,
      substituteId: swap.substitute.dayId,
      at: new Date().toISOString(),
      week: 1,
    }])

    expect(order).toHaveLength(365)                                  // nothing dropped
    expect(new Set(order.map((d) => d.dayId)).size).toBe(365)        // nothing duplicated
    expect(order[1].dayId).toBe(swap.substitute.dayId)               // lighter day is up next
    const movedTo = order.findIndex((d) => d.dayId === deferred.dayId)
    expect(movedTo).toBeGreaterThan(1)                               // the original is still coming
  })

  it('caps at two a week', async () => {
    const { swapsUsedInWeek } = await import('../swaps')
    const swaps = [
      { deferredId: 'a', substituteId: 'b', at: '', week: 1 },
      { deferredId: 'c', substituteId: 'd', at: '', week: 1 },
      { deferredId: 'e', substituteId: 'f', at: '', week: 2 },
    ]
    expect(swapsUsedInWeek(swaps, 1)).toBe(2)
    expect(swapsUsedInWeek(swaps, 2)).toBe(1)
  })

  it('ignores a swap whose day was hand-edited out of the file', async () => {
    const { orderedDays } = await import('../swaps')
    const order = orderedDays(curriculum, [{
      deferredId: 'p1-d002-ghosting-point-to-point',
      substituteId: 'p9-d999-deleted-long-ago',
      at: '', week: 1,
    }])
    expect(order).toHaveLength(365)
    expect(order[1].day).toBe(2)   // order is simply left alone
  })
})

describe('jump to a day', () => {
  it('moves the starting point without inventing history', async () => {
    const { orderedDays } = await import('../swaps')
    const order = orderedDays(curriculum, [], 47)
    expect(order[0].day).toBe(47)
    expect(order).toHaveLength(365 - 46)
    expect(await allProgress()).toHaveLength(0)   // no fake completions written
  })
})

describe('seeded history is plausible', () => {
  it('never stamps a day in the future', async () => {
    await seedDemoData(curriculum)
    const rows = await allProgress()
    const now = Date.now()
    const future = rows.filter((r) => Date.parse(r.completedAt) > now)
    expect(future.map((r) => `day ${r.day} @ ${r.planDate}`)).toEqual([])
  })

  it('runs in date order, ending on or near today', async () => {
    await seedDemoData(curriculum)
    const rows = await allProgress()
    for (let i = 1; i < rows.length; i++) {
      expect(Date.parse(rows[i].completedAt)).toBeGreaterThan(Date.parse(rows[i - 1].completedAt))
    }
    const last = new Date(rows[rows.length - 1].completedAt)
    const ageDays = Math.floor((Date.now() - last.getTime()) / 86_400_000)
    expect(ageDays).toBeLessThanOrEqual(1)
  })
})
