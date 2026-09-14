import { driftByType, skipRates, project, deadlineViews, phaseProgress } from '../lib/stats'
import { phaseOf } from '../lib/curriculum'
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
      <h1 className="font-display text-[26px] font-semibold tracking-[-0.015em]">Where you are</h1>

      <div className="mt-8 space-y-px">
        {curriculum.phases.map((p) => {
          const { completed, total, fraction } = phaseProgress(curriculum, records, p.phase)
          const isCurrent = p.phase === current?.phase
          return (
            <div key={p.phase} className="border-b border-[var(--rule)] py-3">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-display text-[14px] font-semibold">
                  <span className="tnum mr-2 text-[var(--ink-3)]">P{p.phase}</span>
                  {p.title}
                </div>
                <div className="font-display tnum text-[12px] text-[var(--ink-3)]">
                  {completed} / {total}
                </div>
              </div>
              <div className="mt-2 h-[6px] w-full bg-[var(--cell-untouched)]">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.round(fraction * 100)}%`,
                    background: isCurrent ? 'var(--color-foam-deep)' : 'var(--color-foam)',
                  }}
                />
              </div>
              {isCurrent && (
                <p className="mt-2 max-w-[60ch] text-[13px] text-[var(--ink-2)]">{p.goal}</p>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        Estimated against actual
      </h2>
      {drift.length === 0 ? (
        <p className="text-[13.5px] text-[var(--ink-2)]">
          Nothing yet. The time you tap after finishing a day is what fills this in.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="font-display text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
                <th className="pb-2 text-left font-medium">TYPE</th>
                <th className="pb-2 text-right font-medium">PLANNED</th>
                <th className="pb-2 text-right font-medium">ACTUAL</th>
                <th className="pb-2 text-right font-medium">GAP</th>
                <th className="pb-2 text-right font-medium">N</th>
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
                    style={{ color: d.overrunning ? 'var(--color-cinnabar)' : undefined }}
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
              <b>{d.type}</b> days are taking about {d.actual} minutes against a planned{' '}
              {d.estimated}. The estimate is wrong. Cut the task rather than pushing through it —
              curriculum.json is editable and this is the number that says which days to cut.
            </p>
          ))}
        </>
      )}

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        What gets done, by type
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
                      background: r.falling ? 'var(--color-marker)' : 'var(--color-foam-deep)',
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
              <b>{r.type}</b> days are getting done {Math.round(r.rate * 100)}% of the time. Either
              make those tasks smaller, or drop that strand on purpose — both are fine, drifting is
              the one that costs you.
            </p>
          ))}
        </>
      )}

      <h2 className="font-display mt-14 mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[13px] font-semibold">
        Rate and finish date
      </h2>
      <dl className="tnum font-display grid max-w-[560px] grid-cols-2 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-3">
        <Stat label="days a week" value={projection.daysPerWeek?.toFixed(1) ?? '—'} />
        <Stat label="days left" value={String(projection.remaining)} />
        <Stat label="day 365 lands" value={projection.projectedFinish ?? '—'} />
      </dl>
      <p className="mt-3 max-w-[60ch] text-[12px] text-[var(--ink-3)]">
        Projected from the rate you actually work at, not from the calendar.
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
                    style={{ color: d.urgent ? 'var(--color-cinnabar)' : undefined }}
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
                ? 'At your current rate, Phase 6 lands after at least one of these deadlines. That is the number to adjust against — either the rate, or which schools go in the first round.'
                : 'At your current rate, Phase 6 lands before every deadline above.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.03em] text-[var(--ink-3)]">{label.toUpperCase()}</dt>
      <dd className="mt-1 text-[15px] font-medium">{value}</dd>
    </div>
  )
}
