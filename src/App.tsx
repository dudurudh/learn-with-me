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
import { Wordmark } from './components/Wordmark'

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
        body: todayNumber ? `Day ${todayNumber}: ${todayTitle ?? ''}` : 'Open the app.',
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
          Your progress is safe. The curriculum file failed to load, not your records.
        </p>
      </Shell>
    )
  }
  if (!plan || !settings) return null


  return (
    <Shell
      header={
        <>
          <Wordmark />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
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
                  style={active ? { background: 'var(--color-accent)' } : undefined}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden />
                  {label}
                </button>
              )
            })}
            </nav>

            <div className="font-display text-[14px] text-[var(--ink-2)]">
              You have done <span className="tnum font-semibold text-graphite">{plan.worked}</span> days.
              {' '}<span className="tnum">{365 - plan.completed}</span> left to go.
              {settings.seeded && (
                <span className="ml-3 rounded-full bg-p3 px-[9px] py-[2px] text-[11px] text-page">demo</span>
              )}
            </div>
          </div>
        </>
      }
    >
      {plan.backupPrompt !== 'none' && view !== 'settings' && (
        <p className="mb-8 rounded-[10px] bg-surface px-4 py-3 text-[14px] text-[var(--ink-2)]">
          {plan.backupPrompt === 'count'
            ? 'You have finished several days since your last backup.'
            : 'You have not backed up in a while.'}{' '}
          <button
            className="underline underline-offset-4"
            onClick={() => void exportToFile().then(refresh)}
          >
            Download a copy now
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

function Shell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <>
      {header && (
        <header className="border-b border-[var(--rule)] bg-page">
          <div className="mx-auto max-w-[860px] px-6 py-5">{header}</div>
        </header>
      )}
      <main className="mx-auto max-w-[860px] px-6 py-10 sm:py-12">{children}</main>
    </>
  )
}
