import { useState } from 'react'
import { Today } from './components/Today'
import { Drawer } from './components/Drawer'
import { Log } from './components/Log'
import { Benchmarks } from './components/Benchmarks'
import { Settings } from './components/Settings'
import { exportToFile } from './lib/backup'
import { useApp } from './lib/useApp'

type View = 'today' | 'drawer' | 'series' | 'log' | 'settings'

const TABS: { key: View; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'drawer', label: 'Drawer' },
  { key: 'series', label: 'Series' },
  { key: 'log', label: 'Log' },
  { key: 'settings', label: 'Settings' },
]

export default function App() {
  const app = useApp()
  const [view, setView] = useState<View>('today')
  const { plan, settings, loading, error, refresh } = app

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
      <header className="mb-9 flex flex-wrap items-baseline justify-between gap-4">
        <div className="font-display tnum text-[11px] tracking-[0.02em] text-[var(--ink-3)]">
          {String(plan.worked).padStart(3, '0')} WORKED
          <span className="mx-2">·</span>
          {365 - plan.completed} LEFT
          {settings.seeded && (
            <span className="ml-3 bg-cinnabar px-[6px] py-[2px] text-[10px] text-paper">DEMO</span>
          )}
        </div>
        <nav className="flex gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              aria-current={view === t.key ? 'page' : undefined}
              className={
                'font-display px-[14px] py-[8px] text-[12.5px] font-medium transition-colors duration-100 ' +
                (view === t.key
                  ? 'bg-foam-deep text-paper'
                  : 'bg-paper hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]')
              }
            >
              {t.label}
            </button>
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
      {view === 'series' && <Benchmarks app={app} />}
      {view === 'log' && <Log app={app} />}
      {view === 'settings' && <Settings app={app} />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[860px] px-6 py-10 sm:py-14">{children}</main>
}
