import { useEffect, useState } from 'react'
import { Today } from './components/Today'
import { Drawer } from './components/Drawer'
import { Log } from './components/Log'
import { Benchmarks } from './components/Benchmarks'
import { Collection } from './components/Collection'
import { Phase } from './components/Phase'
import { Schools } from './components/Schools'
import { Settings } from './components/Settings'
import { exportToFile } from './lib/backup'
import { useApp } from './lib/useApp'
import { notificationState, scheduleInApp } from './lib/reminders'

type View = 'today' | 'drawer' | 'wall' | 'series' | 'phase' | 'schools' | 'log' | 'settings'

const TABS: { key: View; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'drawer', label: 'Drawer' },
  { key: 'wall', label: 'Wall' },
  { key: 'series', label: 'Series' },
  { key: 'phase', label: 'Phase' },
  { key: 'schools', label: 'Schools' },
  { key: 'log', label: 'Log' },
  { key: 'settings', label: 'Settings' },
]

export default function App() {
  const app = useApp()
  const [view, setView] = useState<View>('today')
  const { plan, settings, loading, error, refresh } = app

  // Only fires while a tab is open — that is the documented limitation, not a
  // bug. The calendar file is the mechanism that works when this is closed.
  const reminderTime = settings?.reminderTime
  const todayTitle = plan?.today?.title
  const todayNumber = plan?.today?.day
  useEffect(() => {
    if (!reminderTime || notificationState() !== 'granted') return
    return scheduleInApp(reminderTime, () => {
      new Notification('Today\u2019s task', {
        body: todayNumber ? `Day ${todayNumber} — ${todayTitle ?? ''}` : 'Open the app.',
        icon: `${import.meta.env.BASE_URL}icon-192.png`,
        tag: 'learn-with-me-daily',
      })
    })
  }, [reminderTime, todayTitle, todayNumber])

  if (loading) return <Shell><p className="text-[var(--ink-2)]">Opening the drawer…</p></Shell>
  if (error) {
    return (
      <Shell>
        <p className="text-cinnabar">{error}</p>
        <p className="mt-3 text-[13.5px] text-[var(--ink-2)]">
          Your progress is untouched — this is the curriculum file failing to load, not your data.
        </p>
      </Shell>
    )
  }
  if (!plan || !settings) return null

  return (
    <Shell>
      <header className="mb-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <div className="font-display text-[14px] text-[var(--ink-2)]">
          <span className="tnum font-semibold text-graphite">{plan.worked}</span> days collected
          <span className="mx-2 text-[var(--marker)]">/</span>
          <span className="tnum">{365 - plan.completed}</span> to go
          {settings.seeded && (
            <span className="ml-3 bg-cinnabar px-[7px] py-[2px] text-[11px] text-paper">demo</span>
          )}
        </div>
        {/* Six tabs do not fit a 375px screen in one row. Wrapping keeps them
            all reachable without the page itself scrolling sideways. */}
        <nav className="grid grid-cols-4 gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)] sm:flex sm:flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              aria-current={view === t.key ? 'page' : undefined}
              className={
                'font-display whitespace-nowrap px-[12px] py-[10px] text-[13px] font-medium ' +
                'transition-[background-color,transform] duration-100 active:translate-y-[1px] ' +
                'sm:px-[14px] sm:py-[8px] sm:text-[12.5px] ' +
                (view === t.key
                  ? 'bg-foam-deep text-paper'
                  : 'bg-paper hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]')
              }
            >
              {t.label}
            </button>
          ))}
          {/* The grout here is the container showing through the gaps, so any
              cell the tabs do not fill reads as a grey slab. Third time this
              has bitten: drawer, photo wall, now the nav. */}
          {Array.from({ length: (4 - (TABS.length % 4)) % 4 }).map((_, i) => (
            <span key={`pad-${i}`} className="bg-paper sm:hidden" aria-hidden />
          ))}
        </nav>
      </header>

      {plan.backupPrompt !== 'none' && view !== 'settings' && (
        <p className="mb-8 border-t border-b border-[var(--rule)] py-3 text-[13.5px] text-[var(--ink-2)]">
          {plan.backupPrompt === 'count'
            ? 'A few days have gone in since your last backup.'
            : 'It has been a while since your last backup.'}{' '}
          <button
            className="underline underline-offset-4"
            onClick={() => void exportToFile().then(refresh)}
          >
            Download one
          </button>
          .
        </p>
      )}

      {view === 'today' && <Today app={app} onGoTo={setView} />}
      {view === 'drawer' && <Drawer app={app} />}
      {view === 'wall' && <Collection app={app} />}
      {view === 'series' && <Benchmarks app={app} />}
      {view === 'phase' && <Phase app={app} />}
      {view === 'schools' && <Schools app={app} />}
      {view === 'log' && <Log app={app} />}
      {view === 'settings' && <Settings app={app} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[860px] px-6 py-10 sm:py-14">{children}</main>
}
