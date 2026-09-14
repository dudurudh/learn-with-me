import { phaseColour } from '../lib/phaseColour'
import { phaseProgress } from '../lib/stats'
import type { AppState } from '../lib/useApp'

/**
 * Six dividers down the side of the drawer, the way a card index is tabbed.
 * The one you are behind is out; the rest sit flush. It replaces a line of
 * text that said "Phase 4 of 6" and showed you nothing about the other five.
 */
export function PhaseRail({ app, current }: { app: AppState; current: number }) {
  const { curriculum, records } = app
  if (!curriculum) return null

  return (
    <ol className="flex gap-[6px] sm:flex-col sm:gap-[5px]">
      {curriculum.phases.map((p) => {
        const here = p.phase === current
        const { completed, total } = phaseProgress(curriculum, records, p.phase)
        const hue = phaseColour(p.phase)
        const done = completed >= total
        return (
          <li key={p.phase} className="min-w-0">
            <div
              className={
                'flex items-center gap-[9px] rounded-[7px] transition-all duration-150 '
                + (here
                  ? 'px-[11px] py-[8px] sm:pr-[14px]'
                  : 'px-[7px] py-[6px] sm:px-[11px]')
              }
              style={{
                background: here ? `color-mix(in srgb, ${hue} 13%, white)` : 'transparent',
              }}
              aria-current={here ? 'step' : undefined}
            >
              <span
                className="block shrink-0 rounded-[3px]"
                style={{
                  width: here ? 13 : 10,
                  height: here ? 13 : 10,
                  background: hue,
                  opacity: here || done ? 1 : 0.4,
                }}
                aria-hidden
              />
              {/* On a phone only the current divider is labelled, or the rail
                  is six unnamed dots. */}
              <span className={here ? 'block min-w-0' : 'hidden min-w-0 sm:block'}>
                <span
                  className={
                    'font-display block truncate text-[13px] '
                    + (here ? 'font-semibold text-graphite' : 'font-medium text-[var(--ink-2)]')
                  }
                >
                  {p.title}
                </span>
                {here && (
                  <span className="tnum font-display block text-[11.5px] text-[var(--ink-2)]">
                    {completed} of {total} days
                  </span>
                )}
              </span>
              <span className="sr-only">
                Phase {p.phase}, {p.title}
                {here ? ', you are here' : ''}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
