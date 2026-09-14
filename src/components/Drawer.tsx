import { useEffect, useMemo, useState } from 'react'
import { allPhotoDayIds } from '../lib/photos'
import { PhotoStrip } from './PhotoStrip'
import { orderedDays } from '../lib/swaps'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, DayStatus, ProgressRecord } from '../lib/types'

const FILL: Record<DayStatus, string> = {
  full: 'var(--cell-full)',
  minimum: 'var(--cell-minimum)',
  skipped: 'var(--cell-skipped)',
  rest: 'var(--cell-rest)',
}

/** 365 compartments, hairline dividers, nothing rounded. The centrepiece. */
export function Drawer({ app }: { app: AppState }) {
  const { curriculum, records, settings, swaps, plan } = app
  const [withPhotos, setWithPhotos] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<CurriculumDay | null>(null)

  useEffect(() => { void allPhotoDayIds().then(setWithPhotos) }, [records])

  const byId = useMemo(
    () => new Map(records.map((r) => [r.dayId, r])), [records])
  const days = useMemo(
    () => (curriculum ? orderedDays(curriculum, swaps, 1) : []), [curriculum, swaps])

  if (!curriculum || !settings) return null

  const counts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <section>
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">The drawer</h1>
      <p className="mt-2 max-w-[52ch] text-[13.5px] text-[var(--ink-2)]">
        One compartment per day. Colour is how worked the foam is, not how good the day was.
      </p>

      <div className="mt-7 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div className="inline-block border border-[var(--rule-strong)] bg-[var(--rule-strong)]">
          <div className="grid grid-flow-col grid-rows-7 gap-px">
            {days.map((day) => {
              const record = byId.get(day.dayId)
              const has = withPhotos.has(day.dayId)
              const isNext = plan?.today?.dayId === day.dayId
              return (
                <button
                  key={day.dayId}
                  onClick={() => setOpen(day)}
                  title={`Day ${day.day} — ${day.title}`}
                  aria-label={`Day ${day.day}, ${record?.status ?? 'not yet'}`}
                  className="relative h-[14px] w-[14px] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-graphite"
                  style={{
                    background: record
                      ? (day.isBenchmark && record.status !== 'skipped'
                        ? 'var(--color-cinnabar)' : FILL[record.status])
                      : 'var(--cell-untouched)',
                    // Where you are, in a grid of 365 near-identical squares.
                    boxShadow: isNext ? 'inset 0 0 0 2px var(--color-graphite)' : undefined,
                  }}
                >
                  {has && (
                    <span
                      className="absolute bottom-[2px] right-[2px] h-[3px] w-[3px]"
                      style={{
                        background: record && record.status === 'full'
                          ? 'var(--color-paper)' : 'rgba(34,32,29,.45)',
                      }}
                    />
                  )}
                </button>
              )
            })}
            {/* 365 does not divide by 7, so the last column is one cell deep.
                Blanks keep the drawer from ending in a slab of divider grey. */}
            {Array.from({ length: (7 - (days.length % 7)) % 7 }).map((_, i) => (
              <span key={`blank-${i}`} className="h-[14px] w-[14px] bg-paper" aria-hidden />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[var(--ink-2)]">
        <Key fill="var(--cell-untouched)" label={`untouched ${365 - records.length}`} />
        <Key fill="var(--cell-minimum)" label={`minimum ${counts.minimum ?? 0}`} />
        <Key fill="var(--cell-full)" label={`full ${counts.full ?? 0}`} />
        <Key fill="var(--cell-skipped)" label={`skipped ${counts.skipped ?? 0}`} />
        <Key fill="var(--cell-rest)" label={`rest ${counts.rest ?? 0}`} />
        <Key fill="var(--color-cinnabar)" label="benchmark" />
        <span className="tnum">
          <i
            className="mr-[7px] inline-block h-[11px] w-[11px] align-[-1px]"
            style={{ boxShadow: 'inset 0 0 0 2px var(--color-graphite)' }}
          />
          next up
        </span>
      </div>

      {open && (
        <DayDetail
          day={open}
          record={byId.get(open.dayId)}
          onClose={() => setOpen(null)}
          onChange={() => void app.refresh()}
        />
      )}
    </section>
  )
}

function Key({ fill, label }: { fill: string; label: string }) {
  return (
    <span className="tnum">
      <i
        className="mr-[7px] inline-block h-[11px] w-[11px] border border-[var(--rule-strong)] align-[-1px]"
        style={{ background: fill }}
      />
      {label}
    </span>
  )
}

export function DayDetail({
  day, record, onClose, onChange,
}: {
  day: CurriculumDay
  record?: ProgressRecord
  onClose: () => void
  onChange?: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="mt-8 border-t border-[var(--rule-strong)] pt-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-display tnum text-[13px] text-[var(--ink-3)]">
            Day {String(day.day).padStart(3, '0')} &middot; phase {day.phase} &middot;{' '}
            {record ? record.status : 'not yet'}
            {record?.planDate ? ` · ${record.planDate}` : ''}
          </div>
          <div className="font-display mt-2 text-[19px] font-semibold">{day.title}</div>
        </div>
        <button
          onClick={onClose}
          className="font-display text-[12px] text-[var(--ink-3)] underline underline-offset-4"
        >
          close
        </button>
      </div>

      <p className="mt-3 max-w-[60ch] text-[13.5px] text-[var(--ink-2)]">{day.full}</p>

      {record?.note && (
        <p className="mt-4 max-w-[52ch] text-[14px] italic text-[var(--ink-2)]">
          {record.note}
        </p>
      )}

      <PhotoStrip day={day} warnPublic={false} onChange={onChange} />
    </div>
  )
}
