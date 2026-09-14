import { useEffect, useState } from 'react'
import {
  Sun, LayoutGrid, Images, GitCompareArrows, TrendingUp,
  GraduationCap, ScrollText, Settings2,
} from 'lucide-react'
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
import { phaseColour } from './lib/phaseColour'

type View = 'today' | 'drawer' | 'wall' | 'series' | 'phase' | 'schools' | 'log' | 'settings'

const TABS: { key: View; label: string; Icon: typeof Sun }[] = [
  { key: 'today',    label: 'Today',    Icon: Sun },
  { key: 'drawer',   label: 'Drawer',   Icon: LayoutGrid },
  { key: 'wall',     label: 'Wall',     Icon: Images },
  { key: 'series',   label: 'Series',   Icon: GitCompareArrows },
  { key: 'phase',    label: 'Progress', Icon: TrendingUp },
  { key: 'schools',  label: 'Schools',  Icon: GraduationCap },
  { key: 'log',      label: 'Log',      Icon: ScrollText },
  { key: 'settings', label: 'Settings', Icon: Settings2 },
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
        <p className="text-p3">{error}</p>
        <p className="mt-3 text-[13.5px] text-[var(--ink-2)]">
          Your progress is untouched — this is the curriculum file failing to load, not your data.
        </p>
      </Shell>
    )
  }
  if (!plan || !settings) return null

  const hue = phaseColour(plan.today?.phase ?? 6)

  return (
    <Shell>
      <header className="mb-10 flex flex-col gap-5">
        <div className="font-display text-[14px] text-[var(--ink-2)]">
          <span className="tnum font-semibold text-graphite">{plan.worked}</span> days collected
          <span className="mx-2 text-[var(--marker)]">/</span>
          <span className="tnum">{365 - plan.completed}</span> to go
          {settings.seeded && (
            <span className="ml-3 rounded-full bg-p3 px-[9px] py-[2px] text-[11px] text-page">demo</span>
          )}
        </div>
        {/* Soft pills rather than a bordered grid, and the active one picks
            up the colour of the phase you are actually in. */}
        <nav className="-mx-1 flex flex-wrap gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-current={active ? 'page' : undefined}
                className={
                  'font-display flex items-center gap-[7px] rounded-full px-[13px] py-[7px] '
                  + 'text-[13.5px] font-medium transition-[background-color,color,transform] '
                  + 'duration-100 active:translate-y-[1px] '
                  + (active ? 'text-page' : 'text-[var(--ink-2)] hover:bg-surface hover:text-graphite')
                }
                style={active ? { background: hue } : undefined}
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
                {label}
              </button>
            )
          })}
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
