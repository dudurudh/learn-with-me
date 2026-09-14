import { driftByType, skipRates, project, deadlineViews, phaseProgress } from '../lib/stats'
import { phaseOf } from '../lib/curriculum'
import { phaseColour } from '../lib/phaseColour'
import { TrendingUp, Timer, ListChecks, CalendarClock } from 'lucide-react'
import type { AppState } from '../lib/useApp'

export function Phase({ app }: { app: AppState }) {
  const { curriculum, records, plan, settings } = app
  if (!curriculum || !plan || !settings) return null

  const current = plan.today ? phaseOf(curriculum, plan.today.day) : curriculum.phases[5]
  const drift = driftByType(curriculum, records)
  const rates = skipRates(records)
  const projection = project(records)
  const deadlines = deadlineViews(settings.deadlines, projection.projectedFinish)
  const overrunning = drift.filter((d) => d.overrunning)
  const falling = rates.filter((r) => r.falling)

  return (
    <section>
      <h1 className="font-display flex items-center gap-3 text-[30px] font-semibold tracking-[-0.02em]">
        <TrendingUp size={26} strokeWidth={2} className="text-accent" aria-hidden />
        Where you are
      </h1>

      <div className="mt-8 space-y-px">
        {curriculum.phases.map((p) => {
          const { completed, total } = phaseProgress(curriculum, records, p.phase)
          const isCurrent = p.phase === current?.phase
          return (
            <div key={p.phase} className="border-b border-[var(--rule)] py-3">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-display flex items-baseline gap-[9px] text-[15px] font-semibold">
                  <span
                    className="inline-block h-[11px] w-[11px] shrink-0 rounded-[3px]"
                    style={{ background: phaseColour(p.phase) }}
                  />
                  {p.title}
                </div>
                <div className="font-display tnum text-[12px] text-[var(--ink-3)]">
                  {completed} / {total}
                </div>
              </div>
              {/* One cell per day, the same grammar as the drawer, so a
                  phase reads as a block of compartments rather than a bar. */}
              <div className="mt-[10px] flex flex-wrap gap-[2px]">
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className="h-[9px] w-[9px] rounded-[2px]"
                    style={{
                      background: i < completed
                        ? phaseColour(p.phase)
                        : `color-mix(in srgb, ${phaseColour(p.phase)} 13%, white)`,
                    }}
                  />
                ))}
              </div>
              {isCurrent && (
                <p className="mt-2 max-w-[60ch] text-[13px] text-[var(--ink-2)]">{p.goal}</p>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        <span className="flex items-center gap-[9px]">
          <Timer size={17} strokeWidth={2} className="text-accent" aria-hidden />
          Where the plan was wrong
        </span>
      </h2>
      {drift.length === 0 ? (
        <p className="text-[13.5px] text-[var(--ink-2)]">
          There is nothing here yet. This fills in as you record how long each day took.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="font-display text-[12px] text-[var(--ink-3)]">
                <th className="pb-2 text-left font-medium">type</th>
                <th className="pb-2 text-right font-medium">planned</th>
                <th className="pb-2 text-right font-medium">actual</th>
                <th className="pb-2 text-right font-medium">gap</th>
                <th className="pb-2 text-right font-medium">days</th>
              </tr>
            </thead>
            <tbody className="tnum font-display">
              {drift.map((d) => (
                <tr key={d.type} className="border-t border-[var(--rule)]">
                  <td className="py-2 text-left">{d.type}</td>
                  <td className="py-2 text-right">{d.estimated ?? '—'}</td>
                  <td className="py-2 text-right">{d.actual ?? '—'}</td>
                  <td
                    className="py-2 text-right"
                    style={{ color: d.overrunning ? 'var(--color-p3)' : undefined }}
                  >
                    {d.gapPercent === null ? '—' : `${d.gapPercent > 0 ? '+' : ''}${d.gapPercent}%`}
                  </td>
                  <td className="py-2 text-right text-[var(--ink-3)]">{d.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {overrunning.map((d) => (
            <p key={d.type} className="mt-4 max-w-[60ch] text-[13.5px]">
              Your <b>{d.type}</b> days take about {d.actual} minutes, but the plan allows{' '}
              {d.estimated}. The estimate is wrong. Make those tasks smaller rather than pushing
              through them. You can edit curriculum.json yourself, and this number tells you
              which days to cut.
            </p>
          ))}
        </>
      )}

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        <span className="flex items-center gap-[9px]">
          <ListChecks size={17} strokeWidth={2} className="text-accent" aria-hidden />
          What actually gets done
        </span>
      </h2>
      {rates.length === 0 ? (
        <p className="text-[13.5px] text-[var(--ink-2)]">Nothing recorded in the last 30 days.</p>
      ) : (
        <>
          <div className="space-y-2">
            {rates.map((r) => (
              <div key={r.type} className="flex items-center gap-3">
                <span className="font-display w-[58px] text-[12px]">{r.type}</span>
                <span className="h-[10px] flex-1 bg-[var(--cell-untouched)]">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.round(r.rate * 100)}%`,
                      background: r.falling ? 'var(--color-marker)' : 'var(--color-p5)',
                    }}
                  />
                </span>
                <span className="font-display tnum w-[92px] text-right text-[11px] text-[var(--ink-3)]">
                  {r.worked} of {r.attempted}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[var(--ink-3)]">Last 30 recorded days, rest excluded.</p>
          {falling.map((r) => (
            <p key={r.type} className="mt-4 max-w-[60ch] text-[13.5px]">
              You finish <b>{r.type}</b> days {Math.round(r.rate * 100)}% of the time. Either make
              those tasks smaller or decide to drop them. Both are reasonable choices. Drifting
              without deciding is the one that costs you.
            </p>
          ))}
        </>
      )}

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        <span className="flex items-center gap-[9px]">
          <CalendarClock size={17} strokeWidth={2} className="text-accent" aria-hidden />
          Your rate
        </span>
      </h2>
      <p className="max-w-[56ch] text-[17px] leading-[1.6]">
        You are working{' '}
        <span className="tnum font-display font-semibold">
          {projection.daysPerWeek?.toFixed(1) ?? '—'}
        </span>{' '}
        days a week, with{' '}
        <span className="tnum font-display font-semibold">{projection.remaining}</span> to go.
        At that rate Day 365 lands on{' '}
        <span className="tnum font-display font-semibold">
          {projection.projectedFinish ?? 'a date the app cannot guess yet'}
        </span>
        .
      </p>
      <p className="mt-3 max-w-[56ch] text-[14px] text-[var(--ink-2)]">
        This comes from how often you actually finish a day, not from the calendar.
        {projection.daysPerWeek === null && ' Needs about a week of records first.'}
      </p>

      {deadlines.length > 0 && (
        <>
          <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
            Deadlines
          </h2>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {deadlines.map((d) => (
                <tr key={d.id} className="border-t border-[var(--rule)]">
                  <td className="py-3 pr-4">
                    <span className="font-display block text-[13.5px] font-semibold">{d.school}</span>
                    <span className="text-[12px] text-[var(--ink-3)]">{d.programme}</span>
                  </td>
                  <td className="tnum font-display py-3 pr-4 text-right whitespace-nowrap">{d.date}</td>
                  <td
                    className="tnum font-display py-3 text-right whitespace-nowrap"
                    style={{ color: d.urgent ? 'var(--color-p3)' : undefined }}
                  >
                    {d.daysLeft < 0 ? 'passed' : `${d.daysLeft} days`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projection.projectedFinish && (
            <p className="mt-4 max-w-[60ch] text-[13.5px]">
              {deadlines.some((d) => d.finishesBefore === false)
                ? 'At your current pace, you will finish Phase 6 after at least one of these deadlines. You can change the pace, or change which schools you apply to first.'
                : 'At your current pace, you will finish Phase 6 before every deadline above.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}

