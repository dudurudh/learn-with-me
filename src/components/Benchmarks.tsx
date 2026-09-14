import { useEffect, useState } from 'react'
import { photosForDay } from '../lib/photos'
import { daysBetween } from '../lib/time'
import { GitCompareArrows } from 'lucide-react'
import { EmptyFrames } from './Illustration'
import { Panel } from './ui'
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
      <h1 className="font-display flex items-center gap-3 text-[30px] font-semibold tracking-[-0.02em]">
        <GitCompareArrows size={26} strokeWidth={2} className="text-accent" aria-hidden />
        The series
      </h1>
      <p className="mt-2 max-w-[54ch] text-[15px] text-[var(--ink-2)]">
        You draw the same object five times, for fifteen minutes each, with no reference and no
        construction. Keep the conditions the same every time.
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
                  <div className="w-[26px] shrink-0 pt-[186px] sm:w-[32px] sm:pt-[212px]">
                    <div className="border-t border-dashed border-[var(--rule-strong)]" />
                    <div className="tnum font-display mt-2 text-center text-[11px] text-[var(--ink-2)]">
                      {gap}d
                    </div>
                  </div>
                )}

                <figure className="w-[118px] shrink-0 sm:w-[134px]">
                  <div
                    className="flex h-[186px] items-end justify-center sm:h-[212px]"
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
                        className="flex h-[118px] w-[86px] items-center justify-center rounded-[6px] border border-dashed"
                        style={{
                          borderColor: reached ? 'var(--rule-strong)' : 'var(--color-marker)',
                        }}
                      >
                        <span className="font-display tnum text-[11.5px] text-[var(--ink-2)]">
                          {reached ? 'no photo' : 'to come'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pinned to the rule it was collected on. */}
                  <div className="border-t-2 border-graphite pt-[10px]">
                    <div className="font-display tnum text-[17px] font-semibold leading-none">
                      {String(s.day.day).padStart(3, '0')}
                    </div>
                    <div className="tnum font-display mt-[5px] text-[11.5px] text-[var(--ink-2)]">
                      {s.record?.planDate ?? (reached ? 'not recorded' : `in ${s.day.day - nextDay + 1} days`)}
                    </div>
                    {s.record?.note && (
                      <p className="mt-2 text-[11.5px] italic leading-snug text-[var(--ink-2)]">
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

      <div className="mt-9 max-w-[66ch]">
        <Panel>
          {taken === 0 && <div className="mb-4 flex justify-center"><EmptyFrames /></div>}
          <p className="tnum font-display text-[17px] font-medium">
            You have photographed {taken} of the 5
            {elapsed > 0 && (
              <span className="text-[var(--ink-2)]">, over {elapsed} days</span>
            )}
          </p>
          <p className="mt-2 max-w-[54ch] text-[14px] text-[var(--ink-2)]">
            {taken === 0
              ? 'On Day 1 you pick the object and draw it before you have learned anything. Everything else on this screen is measured against that drawing, so let it be bad.'
              : taken < 5
                ? 'The empty frames matter as much as the full ones. You fill them on days 90, 180, 270, and 365. There is no way to fill them early.'
                : 'Here are five drawings of one object, made a year apart. This is your evidence.'}
          </p>
        </Panel>
      </div>
    </section>
  )
}
