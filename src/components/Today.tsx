import { useEffect, useState } from 'react'
import { Button, ButtonRow } from './ui'
import { markDay } from '../lib/progress'
import { findSwap } from '../lib/plan'
import { addSwap } from '../lib/swaps'
import { db } from '../lib/db'
import { phaseOf } from '../lib/curriculum'
import { weekOf } from '../lib/plan'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, DayStatus, TimeBucket } from '../lib/types'

const BUCKETS: { key: TimeBucket; label: string }[] = [
  { key: 'under10', label: 'under 10' },
  { key: '10to20', label: '10–20' },
  { key: '20to40', label: '20–40' },
  { key: '40plus', label: '40+' },
]

export function Today({ app, onGoTo }: { app: AppState; onGoTo: (v: 'drawer') => void }) {
  const { curriculum, plan, settings, refresh } = app
  const [note, setNote] = useState('')
  const [justDid, setJustDid] = useState<{ day: CurriculumDay; status: DayStatus } | null>(null)
  const [swapNote, setSwapNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const today = plan?.today ?? null
  useEffect(() => { setNote(''); setSwapNote(null) }, [today?.dayId])

  if (!curriculum || !plan || !settings) return null

  if (justDid) {
    return <Recorded
      day={justDid.day}
      status={justDid.status}
      onTime={async (bucket) => {
        const record = await (await db()).get('progress', justDid.day.dayId)
        if (record) await (await db()).put('progress', { ...record, actualTime: bucket })
        setJustDid(null)
        await refresh()
      }}
      onSkipTime={async () => { setJustDid(null); await refresh() }}
      onSeeDrawer={() => { setJustDid(null); void refresh(); onGoTo('drawer') }}
    />
  }

  if (!today) {
    return (
      <div className="border-t border-[var(--rule-strong)] pt-6">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.015em]">
          Three hundred and sixty-five
        </h1>
        <p className="mt-3 max-w-[52ch] text-[var(--ink-2)]">
          Every day in the plan has a record against it. The drawer is full.
        </p>
      </div>
    )
  }

  const phase = phaseOf(curriculum, today.day)
  const resource = today.resource ? curriculum.resources[today.resource.id] : null

  const mark = async (status: DayStatus) => {
    setBusy(true)
    try {
      await markDay(today, { status, note })
      setJustDid({ day: today, status })
    } finally {
      setBusy(false)
    }
  }

  const swap = async () => {
    const result = findSwap(curriculum, new Map(app.records.map((r) => [r.dayId, r])), today)
    if (!result) { setSwapNote('Nothing lighter left in this phase to swap in.'); return }
    await addSwap({
      deferredId: today.dayId,
      substituteId: result.substitute.dayId,
      at: new Date().toISOString(),
      week: weekOf(today.day),
    })
    await refresh()
  }

  return (
    <article>
      <div className="font-display text-[11px] tracking-[0.02em] text-[var(--ink-3)]">
        PHASE {today.phase} &middot; {phase?.title.toUpperCase()}
      </div>

      <div className="mt-4 flex items-baseline gap-4">
        <span className="font-display tnum text-[42px] leading-none font-bold tracking-[-0.03em]">
          {String(today.day).padStart(3, '0')}
        </span>
        <h1 className="font-display text-[23px] font-semibold tracking-[-0.012em]">
          {today.title}
        </h1>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--ink-2)]">
        <span>{today.type}</span>
        <span>&middot;</span>
        <span className="tnum">{today.minutes} min</span>
        {today.isProjectBlock && <><span>&middot;</span><span>project block</span></>}
        {today.isDeload && <><span>&middot;</span><span>light week</span></>}
        {today.isBenchmark && (
          <span className="font-display bg-cinnabar px-[6px] py-[2px] text-[10px] tracking-[0.04em] text-paper">
            BENCHMARK
          </span>
        )}
      </div>

      <p className="mt-5 max-w-[60ch] text-[15px]">{today.full}</p>

      {today.question && (
        <p className="mt-6 max-w-[48ch] border-l-2 border-cinnabar pl-[13px] text-[14.5px] italic text-[var(--ink-2)]">
          {today.question}
        </p>
      )}

      <div className="mt-6 border-t border-[var(--rule)] pt-4">
        <div className="font-display text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
          IF TODAY IS A BAD DAY
        </div>
        <p className="mt-1 max-w-[56ch] text-[13.5px] text-[var(--ink-2)]">{today.minimum}</p>
      </div>

      {resource && today.resource && (
        <p className="mt-5 text-[12.5px] text-[var(--ink-3)]">
          <span
            className={
              'font-display mr-[7px] border border-[var(--rule-strong)] px-[5px] py-[1px] text-[9.5px] tracking-[0.04em] ' +
              (today.resourceMode === 'assigned' ? 'border-transparent bg-graphite text-paper' : '')
            }
          >
            {today.resourceMode?.toUpperCase()}
          </span>
          {resource.title}
          {today.resource.section ? ` — ${today.resource.section}` : ''}
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Marginalia"
        className="mt-7 w-full max-w-[60ch] resize-y border-l-2 border-[var(--marker)] bg-transparent pl-[13px] text-[13.5px] italic text-[var(--ink-2)] placeholder:text-[var(--ink-3)] focus:outline-none focus-visible:border-graphite"
      />

      <div className="mt-6">
        <ButtonRow>
          <Button primary disabled={busy} onClick={() => void mark('full')}>
            {today.isRest ? 'Nothing today' : 'Done'}
          </Button>
          {!today.isRest && (
            <>
              <Button disabled={busy} onClick={() => void mark('minimum')}>Minimum done</Button>
              <Button
                disabled={busy || plan.swapsLeft === 0}
                title={plan.swapsLeft === 0 ? 'Two a week, and this week is spent' : undefined}
                onClick={() => void swap()}
              >
                Not this one today
              </Button>
              <Button disabled={busy} onClick={() => void mark('skipped')}>Skip</Button>
            </>
          )}
        </ButtonRow>
      </div>

      {swapNote && <p className="mt-3 text-[13px] text-[var(--ink-2)]">{swapNote}</p>}

      <div className="tnum font-display mt-5 flex flex-wrap gap-x-7 gap-y-1 text-[12px] text-[var(--ink-3)]">
        <span>streak {plan.streak}</span>
        <span>grace {plan.graceRemaining} of {settings.graceBudget}</span>
        {!today.isRest && <span>swaps {plan.swapsLeft} of {settings.swapsPerWeek} this week</span>}
      </div>
    </article>
  )
}

/** The one considered moment: the cell fills, and nothing else moves. */
function Recorded({
  day, status, onTime, onSkipTime, onSeeDrawer,
}: {
  day: CurriculumDay
  status: DayStatus
  onTime: (b: TimeBucket) => Promise<void>
  onSkipTime: () => Promise<void>
  onSeeDrawer: () => void
}) {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const fill =
    status === 'full' ? 'var(--cell-full)'
      : status === 'minimum' ? 'var(--cell-minimum)'
        : status === 'skipped' ? 'var(--cell-skipped)'
          : 'var(--cell-rest)'

  return (
    <div className="border-t border-[var(--rule-strong)] pt-8">
      <div className="flex items-center gap-5">
        <span
          className="h-14 w-14 border border-[var(--rule-strong)]"
          style={{
            background: filled ? fill : 'var(--cell-untouched)',
            transition: 'background 180ms cubic-bezier(.2,.7,.35,1)',
          }}
        />
        <div>
          <div className="font-display tnum text-[19px] font-semibold">
            Day {String(day.day).padStart(3, '0')} recorded
          </div>
          <div className="text-[13px] text-[var(--ink-2)]">
            {status === 'full' ? 'Full' : status === 'minimum' ? 'Minimum'
              : status === 'skipped' ? 'Skipped' : 'Rest'} &middot; {day.title}
          </div>
        </div>
      </div>

      {(status === 'full' || status === 'minimum') && (
        <div className="mt-9">
          <div className="font-display text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
            HOW LONG DID IT ACTUALLY TAKE
          </div>
          <div className="mt-3">
            <ButtonRow>
              {BUCKETS.map((b) => (
                <Button key={b.key} onClick={() => void onTime(b.key)}>{b.label}</Button>
              ))}
            </ButtonRow>
          </div>
          <p className="mt-3 text-[12px] text-[var(--ink-3)]">
            Estimated {day.minutes} minutes. This is how the plan finds out where it was wrong.
          </p>
        </div>
      )}

      <div className="mt-9 flex gap-6 text-[13px]">
        <button className="underline underline-offset-4 hover:text-[var(--ink-2)]" onClick={onSeeDrawer}>
          See the drawer
        </button>
        <button className="underline underline-offset-4 hover:text-[var(--ink-2)]" onClick={() => void onSkipTime()}>
          Next day
        </button>
      </div>
    </div>
  )
}
