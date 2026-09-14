import { useEffect, useState } from 'react'
import { photosForDay } from '../lib/photos'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, PhotoRecord, ProgressRecord } from '../lib/types'

interface Specimen {
  day: CurriculumDay
  record?: ProgressRecord
  photos: PhotoRecord[]
  url: string | null
}

/**
 * The same object at five stages, a year apart end to end. This is the payoff
 * the whole plan is built around, so it gets the most room and the least
 * decoration — the drawings do the work.
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

  return (
    <section>
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">The series</h1>
      <p className="mt-2 max-w-[56ch] text-[13.5px] text-[var(--ink-2)]">
        One object, drawn cold for fifteen minutes on five days across a year. Same object,
        same conditions, no technique you did not have on Day 1.
      </p>

      <div className="mt-9 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-px bg-[var(--rule-strong)] p-px">
          {specimens.map((s) => {
            const reached = s.day.day < nextDay
            return (
              <figure key={s.day.dayId} className="flex w-[190px] flex-col bg-paper sm:w-[210px]">
                <div className="flex h-[250px] items-center justify-center overflow-hidden sm:h-[280px]">
                  {s.url ? (
                    <img
                      src={s.url}
                      alt={`The benchmark object on day ${s.day.day}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span
                      className="font-display tnum text-[46px] font-bold tracking-[-0.03em]"
                      style={{ color: reached ? 'var(--ink-3)' : 'var(--color-marker)' }}
                    >
                      {String(s.day.day).padStart(3, '0')}
                    </span>
                  )}
                </div>
                <figcaption className="border-t border-[var(--rule)] px-3 py-[10px]">
                  <div className="font-display tnum text-[15px] font-semibold">
                    Day {String(s.day.day).padStart(3, '0')}
                  </div>
                  <div className="font-display mt-[3px] text-[11.5px] text-[var(--ink-3)]">
                    {s.record?.planDate
                      ? s.record.planDate
                      : reached
                        ? 'not recorded'
                        : `${s.day.day - nextDay + 1} days away`}
                  </div>
                  {s.record?.note && (
                    <p className="mt-2 text-[12px] italic leading-snug text-[var(--ink-2)]">
                      {s.record.note}
                    </p>
                  )}
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>

      <p className="font-display tnum mt-5 text-[13px] text-[var(--ink-3)]">
        {taken} of 5 collected
      </p>

      {taken === 0 && (
        <p className="mt-6 max-w-[56ch] text-[13.5px] text-[var(--ink-2)]">
          Nothing here yet. Day 1 is where you pick the object and draw it before you know
          anything — that drawing is the one this whole screen is measured against, so it is
          worth being genuinely bad.
        </p>
      )}
      {taken > 0 && taken < 5 && (
        <p className="mt-6 max-w-[56ch] text-[13.5px] text-[var(--ink-2)]">
          The empty compartments are the point. They fill on days 90, 180, 270 and 365, and
          there is no way to fill them early.
        </p>
      )}
    </section>
  )
}
