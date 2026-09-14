import { useEffect, useMemo, useState } from 'react'
import { allPhotoDayIds } from '../lib/photos'
import { PhotoStrip } from './PhotoStrip'
import { orderedDays } from '../lib/swaps'
import { cellFill, cellShape, phaseColour } from '../lib/phaseColour'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, ProgressRecord } from '../lib/types'

/**
 * Six drawers in a cabinet, one per phase, each in its own colour. The old
 * version was a single 53-by-7 grid in one hue: accurate, and about as
 * inviting as a spreadsheet.
 */
export function Drawer({ app }: { app: AppState }) {
  const { curriculum, records, swaps, plan } = app
  const [withPhotos, setWithPhotos] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<CurriculumDay | null>(null)

  useEffect(() => { void allPhotoDayIds().then(setWithPhotos) }, [records])

  const byId = useMemo(() => new Map(records.map((r) => [r.dayId, r])), [records])
  const days = useMemo(
    () => (curriculum ? orderedDays(curriculum, swaps, 1) : []), [curriculum, swaps])

  if (!curriculum) return null

  const worked = records.filter((r) => r.status === 'full' || r.status === 'minimum').length

  return (
    <section>
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">The drawer</h1>
      <p className="mt-2 max-w-[56ch] text-[15px] text-[var(--ink-2)]">
        {worked === 0
          ? 'Three hundred and sixty-five compartments, one per day. They fill up as you go.'
          : `${worked} of them filled so far. Each phase has its own colour, and how solid a square is says how much of that day you did.`}
      </p>

      <div className="mt-10 space-y-9">
        {curriculum.phases.map((phase) => {
          const phaseDays = days.filter((d) => d.phase === phase.phase)
          const done = phaseDays.filter((d) => byId.has(d.dayId)).length
          const hue = phaseColour(phase.phase)
          return (
            <div key={phase.phase}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <span
                  className="inline-block h-[13px] w-[13px] rounded-[3px]"
                  style={{ background: hue }}
                />
                <h2 className="font-display text-[17px] font-semibold">{phase.title}</h2>
                <span className="tnum font-display text-[14px] text-[var(--ink-2)]">
                  {done} of {phaseDays.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-[3px]">
                {phaseDays.map((day) => {
                  const record = byId.get(day.dayId)
                  const isNext = plan?.today?.dayId === day.dayId
                  return (
                    <button
                      key={day.dayId}
                      onClick={() => setOpen(day)}
                      title={`Day ${day.day} — ${day.title}`}
                      aria-label={`Day ${day.day}, ${record?.status ?? 'not yet'}`}
                      className={`relative h-[17px] w-[17px] ${cellShape(day.isBenchmark)} transition-transform duration-100 hover:scale-[1.18] focus-visible:outline-2 focus-visible:outline-graphite`}
                      style={{
                        background: cellFill(day.phase, record?.status),
                        boxShadow: isNext ? 'inset 0 0 0 2px var(--color-graphite)' : undefined,
                      }}
                    >
                      {withPhotos.has(day.dayId) && (
                        <span
                          className="absolute bottom-[2.5px] right-[2.5px] h-[3.5px] w-[3.5px] rounded-full"
                          style={{
                            background: record?.status === 'full'
                              ? 'rgba(255,255,255,.95)' : 'rgba(31,29,27,.45)',
                          }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-[var(--ink-2)]">
        <Key fill="color-mix(in srgb, var(--color-p1) 13%, white)" label="not yet" />
        <Key fill="color-mix(in srgb, var(--color-p1) 46%, white)" label="the minimum" />
        <Key fill="var(--color-p1)" label="the whole thing" />
        <Key fill="var(--color-marker)" label="skipped" />
        <span className="tnum">
          <i
            className="mr-[7px] inline-block h-[13px] w-[13px] rounded-full align-[-2px]"
            style={{ background: 'var(--color-p1)' }}
          />
          benchmark day
        </span>
        <span className="tnum">
          <i
            className="mr-[7px] inline-block h-[13px] w-[13px] rounded-[3px] align-[-2px]"
            style={{ boxShadow: 'inset 0 0 0 2px var(--color-graphite)' }}
          />
          you are here
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
        className="mr-[7px] inline-block h-[13px] w-[13px] rounded-[3px] align-[-2px]"
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
    <div
      className="mt-9 rounded-[12px] p-5"
      style={{ background: `color-mix(in srgb, ${phaseColour(day.phase)} 7%, white)` }}
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-display tnum text-[13.5px] text-[var(--ink-2)]">
            Day {String(day.day).padStart(3, '0')} &middot; phase {day.phase}
            {record ? ` · ${record.status}` : ' · not yet'}
            {record?.planDate ? ` · ${record.planDate}` : ''}
          </div>
          <div className="font-display mt-1 text-[21px] font-semibold">{day.title}</div>
        </div>
        <button
          onClick={onClose}
          className="font-display text-[13.5px] text-[var(--ink-2)] underline underline-offset-4"
        >
          close
        </button>
      </div>

      <p className="mt-3 max-w-[60ch] text-[14.5px]">{day.full}</p>

      {record?.note && (
        <p className="mt-4 max-w-[52ch] text-[14px] italic text-[var(--ink-2)]">{record.note}</p>
      )}

      <PhotoStrip day={day} warnPublic={false} onChange={onChange} />
    </div>
  )
}
