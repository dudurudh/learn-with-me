import { useEffect, useState } from 'react'
import { photosForDay } from '../lib/photos'
import { daysBetween } from '../lib/time'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, PhotoRecord, ProgressRecord } from '../lib/types'

interface Specimen {
  day: CurriculumDay
  record?: ProgressRecord
  photos: PhotoRecord[]
  url: string | null
}

/**
 * The same object at five stages, a year apart end to end. Laid out as
 * specimens on a bench rather than a row of cards: each one pinned to the rule
 * it was collected on, with the interval between them written in.
 */
export function Benchmarks({ app }: { app: AppState }) {
  const { curriculum, records, plan } = app
  const [specimens, setSpecimens] = useState<Specimen[]>([])

  useEffect(() => {
    if (!curriculum) return
    let live = true
    const made: string[] = []
    const days = curriculum.days.filter((d) => d.isBenchmark)
    void Promise.all(
      days.map(async (day) => {
        const photos = await photosForDay(day.dayId)
        const url = photos.length ? URL.createObjectURL(photos[0].blob) : null
        if (url) made.push(url)
        return { day, record: records.find((r) => r.dayId === day.dayId), photos, url }
      }),
    ).then((rows) => { if (live) setSpecimens(rows) })
    return () => {
      live = false
      for (const url of made) URL.revokeObjectURL(url)
    }
  }, [curriculum, records])

  if (!curriculum || !plan) return null

  const taken = specimens.filter((s) => s.url).length
  const nextDay = plan.today?.day ?? 365
  const first = specimens[0]?.record?.planDate ?? null
  const last = [...specimens].reverse().find((s) => s.record)?.record?.planDate ?? null
  const elapsed = first && last ? daysBetween(first, last) : 0

  return (
    <section>
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">The series</h1>
      <p className="mt-2 max-w-[54ch] text-[15px] text-[var(--ink-2)]">
        One object, drawn cold for fifteen minutes, five times. Same object, same conditions, no
        technique you did not have on Day 1.
      </p>

      <div className="mt-10 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-start">
          {specimens.map((s, i) => {
            const reached = s.day.day < nextDay
            const gap = i > 0 ? s.day.day - specimens[i - 1].day.day : 0
            return (
              <div key={s.day.dayId} className="flex items-start">
                {/* The interval, written between the specimens rather than implied. */}
                {i > 0 && (
                  <div className="w-[44px] shrink-0 pt-[236px] sm:w-[64px] sm:pt-[300px]">
                    <div className="border-t border-dashed border-[var(--rule-strong)]" />
                    <div className="tnum font-display mt-2 text-center text-[11px] text-[var(--ink-2)]">
                      {gap}d
                    </div>
                  </div>
                )}

                <figure className="w-[178px] shrink-0 sm:w-[224px]">
                  <div
                    className="flex h-[236px] items-end justify-center sm:h-[300px]"
                    style={{ opacity: s.url ? 1 : 0.85 }}
                  >
                    {s.url ? (
                      <img
                        src={s.url}
                        alt={`The benchmark object on day ${s.day.day}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div
                        className="flex h-[132px] w-[104px] items-center justify-center border border-dashed"
                        style={{
                          borderColor: reached ? 'var(--rule-strong)' : 'var(--color-marker)',
                        }}
                      >
                        <span className="font-display tnum text-[13px] text-[var(--ink-2)]">
                          {reached ? 'no photo' : 'to come'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pinned to the rule it was collected on. */}
                  <div className="border-t-2 border-graphite pt-[10px]">
                    <div className="font-display tnum text-[19px] font-semibold leading-none">
                      {String(s.day.day).padStart(3, '0')}
                    </div>
                    <div className="tnum font-display mt-[6px] text-[12px] text-[var(--ink-2)]">
                      {s.record?.planDate ?? (reached ? 'not recorded' : `in ${s.day.day - nextDay + 1} days`)}
                    </div>
                    {s.record?.note && (
                      <p className="mt-2 max-w-[24ch] text-[12.5px] italic leading-snug text-[var(--ink-2)]">
                        {s.record.note}
                      </p>
                    )}
                  </div>
                </figure>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[76px_1fr] sm:grid-cols-[132px_1fr]">
        <div className="font-display pr-4 text-right text-[12px] text-[var(--ink-2)] sm:text-[13px]">
          Collected
        </div>
        <div className="border-l border-[var(--rule-strong)] pl-4 sm:pl-6">
          <p className="tnum font-display text-[15px]">
            {taken} of 5 photographed
            {elapsed > 0 && (
              <span className="text-[var(--ink-2)]"> · {elapsed} days from the first to the last</span>
            )}
          </p>
          <p className="mt-2 max-w-[54ch] text-[14px] text-[var(--ink-2)]">
            {taken === 0
              ? 'Day 1 is where you pick the object and draw it before you know anything. That drawing is what this whole screen is measured against, so it is worth being genuinely bad.'
              : taken < 5
                ? 'The empty frames are the point. They fill on days 90, 180, 270 and 365, and there is no way to fill them early.'
                : 'Five drawings of one object, a year apart end to end. This is the evidence.'}
          </p>
        </div>
      </div>
    </section>
  )
}
