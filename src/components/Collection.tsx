import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { Images } from 'lucide-react'
import { EmptyWall } from './Illustration'
import type { AppState } from '../lib/useApp'
import type { PhotoRecord } from '../lib/types'

interface Specimen {
  photo: PhotoRecord
  url: string
  day: number
  title: string
  phase: number
  isBenchmark: boolean
  planDate: string
}

/**
 * A wall of every photo taken, dated and labelled. The brief was right that
 * this beats any animation — nothing an interface can do competes with two
 * hundred of your own drawings in one place, getting better left to right.
 */
export function Collection({ app }: { app: AppState }) {
  const { curriculum, records } = app
  const [specimens, setSpecimens] = useState<Specimen[]>([])
  const [zoom, setZoom] = useState<Specimen | null>(null)

  const byId = useMemo(
    () => new Map(curriculum?.days.map((d) => [d.dayId, d]) ?? []), [curriculum])
  const recordById = useMemo(
    () => new Map(records.map((r) => [r.dayId, r])), [records])

  useEffect(() => {
    let live = true
    const made: string[] = []
    void (async () => {
      const photos = await (await db()).getAll('photos')
      if (!live) return
      const rows = photos
        .map((photo) => {
          const day = byId.get(photo.dayId)
          const record = recordById.get(photo.dayId)
          const url = URL.createObjectURL(photo.blob)
          made.push(url)
          return {
            photo, url,
            day: day?.day ?? record?.day ?? 0,
            title: day?.title ?? '',
            phase: day?.phase ?? 0,
            isBenchmark: day?.isBenchmark ?? false,
            planDate: record?.planDate ?? photo.createdAt.slice(0, 10),
          }
        })
        .sort((a, b) => a.day - b.day || a.photo.createdAt.localeCompare(b.photo.createdAt))
      setSpecimens(rows)
    })()
    return () => {
      live = false
      for (const url of made) URL.revokeObjectURL(url)
    }
  }, [byId, recordById])

  if (!curriculum) return null

  // auto-fill so the tiles stretch to fill the row. flex-wrap leaves the
  // container's grout showing wherever the last row comes up short.
  const track = '188px'

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display flex items-center gap-3 text-[30px] font-semibold tracking-[-0.02em]">
            <Images size={26} strokeWidth={2} className="text-accent" aria-hidden />
            The collection
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14.5px] text-[var(--ink-2)]">
            {specimens.length === 0
              ? 'This is empty for now. Every photo you take lands here, in order, and stays.'
              : `You have ${specimens.length} photos here, oldest first. Look at the whole wall rather than any one of them.`}
          </p>
        </div>
      </div>

      {specimens.length === 0 && (
        <div className="mt-10 flex justify-center"><EmptyWall /></div>
      )}
      {specimens.length === 0 && (
        <p className="mt-6 max-w-[52ch] text-[14.5px] text-[var(--ink-2)]">
          Take a photo of the page even when the work is bad. In a year, the bad pages are
          what will make the good ones mean something.
        </p>
      )}

      <div
        className="mt-9 grid gap-[5px]"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${track}, 1fr))` }}
      >
        {specimens.map((s) => (
          <figure key={s.photo.id} className="overflow-hidden rounded-[9px] bg-surface">
            <button
              onClick={() => setZoom(s)}
              className="block aspect-square w-full overflow-hidden"
              title={`Day ${s.day} — ${s.title}`}
            >
              <img
                src={s.url}
                alt={`Day ${s.day}, ${s.title}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
            {/* Labelled like a collected sample: number, then date. */}
            <figcaption className="px-2 py-[7px]">
              <span
                className="font-display tnum block text-[12.5px] font-semibold"
                style={{ color: s.isBenchmark ? 'var(--color-graphite)' : undefined }}
              >
                {String(s.day).padStart(3, '0')}
              </span>
              <span className="tnum block text-[10.5px] text-[var(--ink-3)]">{s.planDate}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {zoom && (
        <div className="mt-9 border-t border-[var(--rule-strong)] pt-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-display tnum text-[13px] text-[var(--ink-3)]">
                Day {String(zoom.day).padStart(3, '0')} &middot; phase {zoom.phase} &middot; {zoom.planDate}
              </div>
              <div className="font-display mt-1 text-[21px] font-semibold">{zoom.title}</div>
            </div>
            <button
              onClick={() => setZoom(null)}
              className="font-display text-[13px] text-[var(--ink-3)] underline underline-offset-4"
            >
              close
            </button>
          </div>
          <img
            src={zoom.url}
            alt={`Day ${zoom.day}, ${zoom.title}`}
            className="mt-4 max-h-[70vh] border border-[var(--rule-strong)]"
          />
        </div>
      )}
    </section>
  )
}
