import { useEffect, useState } from 'react'
import { loadProgramChanges, relativeTime, type ProgramResult } from '../lib/extras'
import { deadlineViews, project } from '../lib/stats'
import type { AppState } from '../lib/useApp'
import { GraduationCap, CalendarClock, Eye, Banknote } from 'lucide-react'

interface Watchlist {
  note: string
  schools: {
    id: string; school: string; programme: string; url: string | null
    fundingUrl: string | null; targetDeadline: string | null
    priority: string; urlConfirmed: boolean
  }[]
  funding: { id: string; name: string; url: string | null; note: string | null; urlConfirmed: boolean }[]
}

/**
 * Deadlines and funding are the most time-critical thing in this app, and they
 * were sitting inside a panel that only appears on rest days. Available every
 * day now.
 */
export function Schools({ app }: { app: AppState }) {
  const { records, settings } = app
  const [list, setList] = useState<Watchlist | null>(null)
  const [changes, setChanges] = useState<{ generatedAt: string; results: ProgramResult[] } | null>(null)

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}programs.json`)
      .then((r) => (r.ok ? r.json() : null)).then(setList).catch(() => undefined)
    void loadProgramChanges().then(setChanges)
  }, [])

  if (!settings) return null
  const projection = project(records)
  const deadlines = deadlineViews(settings.deadlines, projection.projectedFinish)
  const byId = new Map(changes?.results.map((r) => [r.id, r]) ?? [])

  return (
    <section>
      <h1 className="font-display flex items-center gap-3 text-[30px] font-semibold tracking-[-0.02em]">
        <GraduationCap size={26} strokeWidth={2} className="text-accent" aria-hidden />
        Schools and money
      </h1>
      <p className="mt-2 max-w-[58ch] text-[14.5px] text-[var(--ink-2)]">
        Schools change their deadlines and funding without warning. This page watches the
        real admissions pages instead of storing dates that go out of date. None of the dates
        here are invented.
      </p>

      <h2 className="font-display mt-11 mb-4 border-b border-[var(--rule-strong)] pb-[7px] text-[15px] font-semibold">
        <span className="flex items-center gap-[9px]">
          <CalendarClock size={17} strokeWidth={2} className="text-accent" aria-hidden />
          Your deadlines
        </span>
      </h2>
      {deadlines.length === 0 ? (
        <p className="max-w-[58ch] text-[14px] text-[var(--ink-2)]">
          You have not added any yet. Add them in Settings, and any deadline within sixty days
          will appear at the top of the Today view. The app does not ship with real dates,
          because application cycles change every year. A wrong deadline in an app you trust
          is worse than no deadline at all.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-[14px]">
            <tbody>
              {deadlines.map((d) => (
                <tr key={d.id} className="border-b border-[var(--rule)]">
                  <td className="py-3 pr-4">
                    <span className="font-display block text-[14.5px] font-semibold">{d.school}</span>
                    <span className="text-[12.5px] text-[var(--ink-3)]">{d.programme}</span>
                  </td>
                  <td className="tnum font-display py-3 pr-4 text-right whitespace-nowrap">{d.date}</td>
                  <td
                    className="tnum font-display py-3 text-right whitespace-nowrap font-semibold"
                    style={{ color: d.urgent ? 'var(--color-p3)' : undefined }}
                  >
                    {d.daysLeft < 0 ? 'passed' : `${d.daysLeft} days`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projection.projectedFinish && (
            <p className="mt-4 max-w-[58ch] text-[14px]">
              At your current rate Day 365 lands on{' '}
              <span className="tnum font-display font-semibold">{projection.projectedFinish}</span>
              {deadlines.some((d) => d.finishesBefore === false)
                ? ', which is after at least one of these deadlines.'
                : ', which is before all of them.'}
            </p>
          )}
        </>
      )}

      <h2 className="font-display mt-12 mb-4 border-b border-[var(--rule-strong)] pb-[7px] text-[15px] font-semibold">
        <span className="inline-flex items-center gap-[9px]">
          <Eye size={17} strokeWidth={2} className="text-accent" aria-hidden />
          The watchlist
        </span>
        {changes && (
          <span className="ml-2 text-[12.5px] font-normal text-[var(--ink-3)]">
            checked {relativeTime(changes.generatedAt)}
          </span>
        )}
      </h2>
      {list?.schools.map((s) => {
        const change = byId.get(s.id)
        return (
          <div key={s.id} className="border-b border-[var(--rule)] py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <span className="font-display text-[14.5px] font-semibold">{s.school}</span>
                <span className="ml-2 text-[13px] text-[var(--ink-3)]">{s.programme}</span>
              </div>
              <Status change={change} confirmed={s.urlConfirmed} />
            </div>
            {change?.status === 'changed-notable' && change.added?.slice(0, 2).map((line) => (
              <p key={line} className="mt-1 max-w-[62ch] text-[13px] text-[var(--ink-2)]">+ {line}</p>
            ))}
            {s.url && (
              <a
                href={s.url} target="_blank" rel="noreferrer noopener"
                className="font-display mt-1 inline-block text-[12.5px] underline underline-offset-2 text-[var(--ink-3)]"
              >
                {s.url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        )
      })}

      <h2 className="font-display mt-12 mb-4 border-b border-[var(--rule-strong)] pb-[7px] text-[15px] font-semibold">
        <span className="flex items-center gap-[9px]">
          <Banknote size={17} strokeWidth={2} className="text-accent" aria-hidden />
          Funding
        </span>
      </h2>
      <p className="mb-4 max-w-[58ch] text-[13.5px] text-[var(--ink-2)]">
        At US schools, a departmental assistantship makes the biggest difference to what you
        pay. Schools usually decide it when they admit you, not afterwards, so ask about it in
        your application.
      </p>
      {list?.funding.map((f) => (
        <div key={f.id} className="border-b border-[var(--rule)] py-3">
          <span className="font-display text-[14.5px] font-semibold">{f.name}</span>
          {f.note && <p className="mt-1 max-w-[62ch] text-[13px] text-[var(--ink-2)]">{f.note}</p>}
          {f.url && (
            <a
              href={f.url} target="_blank" rel="noreferrer noopener"
              className="font-display mt-1 inline-block text-[12.5px] underline underline-offset-2 text-[var(--ink-3)]"
            >
              {f.url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      ))}

      {list && (
        <p className="mt-8 max-w-[62ch] text-[13px] text-[var(--ink-3)]">{list.note}</p>
      )}
    </section>
  )
}

function Status({ change, confirmed }: { change?: ProgramResult; confirmed: boolean }) {
  if (!confirmed) {
    return (
      <span className="text-[12.5px] text-[var(--ink-3)]">
        not watched yet. Add the real admissions link.
      </span>
    )
  }
  if (!change) return <span className="text-[12.5px] text-[var(--ink-3)]">not checked yet</span>
  if (change.status === 'check-manually') {
    return <span className="text-[12.5px] font-semibold text-p3">check this one yourself</span>
  }
  if (change.status === 'changed-notable' || change.status === 'changed') {
    return <span className="text-[12.5px] font-semibold text-p3">changed this week</span>
  }
  return <span className="text-[12.5px] text-[var(--ink-3)]">no change</span>
}
