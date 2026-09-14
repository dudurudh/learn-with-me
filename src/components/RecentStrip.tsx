import { useMemo } from 'react'
import { orderedDays } from '../lib/swaps'
import type { AppState } from '../lib/useApp'
import type { DayStatus } from '../lib/types'

const FILL: Record<DayStatus, string> = {
  full: 'var(--cell-full)',
  minimum: 'var(--cell-minimum)',
  skipped: 'var(--cell-skipped)',
  rest: 'var(--cell-rest)',
}

/**
 * A fragment of the drawer, on the page you open every day. The whole reward
 * of this app is watching something accumulate, and that should not be hidden
 * behind a tab you have to remember to visit.
 */
export function RecentStrip({ app, weeks = 9 }: { app: AppState; weeks?: number }) {
  const { curriculum, records, swaps, plan } = app

  const cells = useMemo(() => {
    if (!curriculum || !plan) return []
    const order = orderedDays(curriculum, swaps, 1)
    const byId = new Map(records.map((r) => [r.dayId, r]))
    const todayIndex = plan.today
      ? order.findIndex((d) => d.dayId === plan.today!.dayId)
      : order.length - 1
    // End on the current day, so the strip always finishes where you are.
    const end = Math.max(weeks * 7, todayIndex + 1)
    const start = Math.max(0, end - weeks * 7)
    return order.slice(start, end).map((day) => ({
      day,
      record: byId.get(day.dayId),
      isNext: plan.today?.dayId === day.dayId,
    }))
  }, [curriculum, records, swaps, plan, weeks])

  if (cells.length === 0) return null

  return (
    <div
      className="inline-grid grid-flow-col grid-rows-7 gap-[2px]"
      aria-hidden
      title="The last few weeks"
    >
      {cells.map(({ day, record, isNext }) => (
        <span
          key={day.dayId}
          className="h-[11px] w-[11px]"
          style={{
            background: record
              ? (day.isBenchmark && record.status !== 'skipped'
                ? 'var(--color-cinnabar)' : FILL[record.status])
              : 'var(--cell-untouched)',
            boxShadow: isNext ? 'inset 0 0 0 2px var(--color-graphite)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
