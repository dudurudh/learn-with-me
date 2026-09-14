import { useMemo, useState } from 'react'
import { DayDetail } from './Drawer'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, ProgressRecord } from '../lib/types'
import { isReEntryId } from '../lib/reentry'
import { ScrollText } from 'lucide-react'
import { EmptyPage } from './Illustration'

export function Log({ app }: { app: AppState }) {
  const { curriculum, records, plan } = app
  const [open, setOpen] = useState<string | null>(null)
  const [onlyNotes, setOnlyNotes] = useState(false)

  const byId = useMemo(
    () => new Map(curriculum?.days.map((d) => [d.dayId, d]) ?? []), [curriculum])

  if (!curriculum || !plan) return null

  const rows = [...records].reverse()
    .filter((r) => (onlyNotes ? r.note.trim().length > 0 : true))

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display flex items-center gap-3 text-[30px] font-semibold tracking-[-0.02em]">
          <ScrollText size={26} strokeWidth={2} className="text-accent" aria-hidden />
          The log
        </h1>
        <label className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
          <input type="checkbox" checked={onlyNotes} onChange={(e) => setOnlyNotes(e.target.checked)} />
          only days with notes
        </label>
      </div>

      {plan.orphaned.length > 0 && (
        <p className="mt-5 border border-[var(--rule-strong)] p-3 text-[13px] text-[var(--ink-2)]">
          {plan.orphaned.length} record{plan.orphaned.length === 1 ? '' : 's'} below
          {plan.orphaned.length === 1 ? ' points' : ' point'} at a day that is no longer in
          curriculum.json. They are kept exactly as they were, and marked.
        </p>
      )}

      {rows.length === 0 && (
        <div className="mt-10 flex justify-center"><EmptyPage /></div>
      )}
      {rows.length === 0 && (
        <p className="mt-6 text-center text-[var(--ink-2)]">
          {records.length === 0 ? 'Nothing recorded yet.' : 'No notes written yet.'}
        </p>
      )}

      <ol className="mt-6">
        {rows.map((record) => {
          const day = byId.get(record.dayId)
          return (
            <li key={record.dayId} className="border-b border-[var(--rule)]">
              <button
                onClick={() => setOpen(open === record.dayId ? null : record.dayId)}
                className="grid w-full grid-cols-[54px_1fr_auto] items-start gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-graphite sm:grid-cols-[68px_1fr_auto]"
              >
                <span className="font-display tnum text-[17px] font-semibold leading-tight">
                  {isReEntryId(record.dayId) ? '—' : String(record.day).padStart(3, '0')}
                  <span className="mt-[2px] block text-[11px] font-medium text-[var(--ink-3)]">
                    {record.planDate}
                  </span>
                </span>
                <span>
                  <span className="font-display block text-[14.5px] font-semibold">
                    {day ? day.title : isReEntryId(record.dayId) ? 'Coming back' : record.dayId}
                    {isReEntryId(record.dayId) && (
                      <span className="font-display ml-2 border border-[var(--rule-strong)] px-[6px] py-[1px] text-[11px] font-normal text-[var(--ink-3)]">
                        coming back
                      </span>
                    )}
                    {!day && !isReEntryId(record.dayId) && (
                      <span className="font-display ml-2 border border-[var(--rule-strong)] px-[6px] py-[1px] text-[11px] font-normal text-[var(--ink-3)]">
                        orphaned
                      </span>
                    )}
                  </span>
                  {record.note && (
                    <span className="mt-1 block max-w-[52ch] text-[13px] italic text-[var(--ink-2)]">
                      {record.note}
                    </span>
                  )}
                </span>
                <Status record={record} />
              </button>
              {open === record.dayId && day && (
                <div className="pb-5">
                  <DayDetail day={day} record={record} onClose={() => setOpen(null)} onChange={() => void app.refresh()} />
                </div>
              )}
              {open === record.dayId && !day && isReEntryId(record.dayId) && (
                <p className="pb-5 max-w-[56ch] text-[13px] text-[var(--ink-2)]">
                  A short day taken after time away: the warm-up and one drill already behind you.
                  It sits between days {record.day - 1} and {record.day} and counts as a full day.
                </p>
              )}
              {open === record.dayId && !day && !isReEntryId(record.dayId) && (
                <p className="pb-5 text-[13px] text-[var(--ink-2)]">
                  This day was removed from curriculum.json after you completed it. The record is
                  intact: <span className="tnum">{record.status}</span>, {record.planDate}
                  {record.note ? `, “${record.note}”` : ''}.
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Status({ record }: { record: ProgressRecord }) {
  const fill =
    record.status === 'full' ? 'var(--cell-full)'
      : record.status === 'minimum' ? 'var(--cell-minimum)'
        : record.status === 'skipped' ? 'var(--cell-skipped)'
          : 'var(--cell-rest)'
  return (
    <span className="flex items-center gap-2 pt-[3px]">
      <span className="font-display hidden text-[12px] text-[var(--ink-3)] sm:inline">
        {record.status}
      </span>
      <span
        className="h-[14px] w-[14px] border border-[var(--rule-strong)]"
        style={{ background: fill }}
      />
    </span>
  )
}

export function benchmarkDays(days: CurriculumDay[]) {
  return days.filter((d) => d.isBenchmark)
}
