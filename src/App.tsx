import { StoragePanel } from './components/StoragePanel'
import { useApp } from './lib/useApp'
import { phaseOf } from './lib/curriculum'

export default function App() {
  const app = useApp()
  const { curriculum, plan, settings, loading, error } = app

  if (loading) return <Shell><p className="text-[var(--ink-2)]">Opening the drawer…</p></Shell>
  if (error) return <Shell><p className="text-cinnabar">{error}</p></Shell>
  if (!curriculum || !plan || !settings) return null

  const today = plan.today
  const phase = today ? phaseOf(curriculum, today.day) : null

  return (
    <Shell>
      <div className="font-display text-[11px] tracking-[0.02em] text-[var(--ink-3)]">
        STORAGE &middot; STEP 3
      </div>

      <div className="font-display tnum mt-6 text-[78px] leading-[0.92] font-bold tracking-[-0.03em]">
        {String(plan.worked).padStart(3, '0')}
      </div>
      <div className="font-display mt-2 text-[15px] text-[var(--ink-3)]">
        days worked &middot; {365 - plan.completed} remaining
      </div>

      <dl className="tnum font-display mt-8 mb-14 grid max-w-[560px] grid-cols-2 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-4">
        <Stat label="next up" value={today ? `day ${today.day}` : 'finished'} />
        <Stat label="streak" value={String(plan.streak)} />
        <Stat label="grace left" value={`${plan.graceRemaining} of ${settings.graceBudget}`} />
        <Stat label="orphaned" value={String(plan.orphaned.length)} />
      </dl>

      {today && (
        <div className="mb-14 border-t border-[var(--rule-strong)] pt-5">
          <div className="font-display text-[11px] tracking-[0.02em] text-[var(--ink-3)]">
            PHASE {today.phase} &middot; {phase?.title.toUpperCase()}
          </div>
          <div className="font-display mt-[10px] text-[23px] font-semibold tracking-[-0.012em]">
            {today.title}
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--ink-2)]">
            {today.type} &middot; {today.minutes} min
            {today.isBenchmark && ' · benchmark'}
            {today.isDeload && ' · light week'}
          </div>
          <p className="mt-4 max-w-[60ch]">{today.full}</p>
          {today.question && (
            <p className="mt-5 max-w-[48ch] border-l-2 border-cinnabar pl-[13px] text-[14.5px] italic text-[var(--ink-2)]">
              {today.question}
            </p>
          )}
          <p className="mt-5 text-[12px] text-[var(--ink-3)]">
            The controls for this live in step 4. Nothing here is markable yet.
          </p>
        </div>
      )}

      {plan.backupPrompt !== 'none' && (
        <p className="mb-14 border-t border-b border-[var(--rule)] py-3 text-[13.5px] text-[var(--ink-2)]">
          {plan.backupPrompt === 'count'
            ? 'Worth taking a backup — quite a few days have gone in since the last one.'
            : 'It has been a while since the last backup.'}
        </p>
      )}

      <StoragePanel app={app} />
    </Shell>
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

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-[860px] px-6 py-14">{children}</main>
}
