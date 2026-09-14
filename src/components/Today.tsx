import { useEffect, useState } from 'react'
import { Button, ButtonRow, Callout, Panel } from './ui'
import { phaseColour } from '../lib/phaseColour'
import { activityOf } from '../lib/activity'
import { Clock3, Check, Minus, Shuffle, X } from 'lucide-react'
import { PhotoStrip } from './PhotoStrip'
import { RecentStrip } from './RecentStrip'
import { PhaseRail } from './PhaseRail'
import { NewsPanel, SavedQueue } from './NewsPanel'
import { FollowPrompt } from './FollowPrompt'
import { SundayPanel } from './SundayPanel'
import { markDay } from '../lib/progress'
import { syncAfterCompletion } from '../lib/gist'
import { shouldWarnAboutPublicPhotos } from '../lib/addPhoto'
import { findSwap } from '../lib/plan'
import { addSwap } from '../lib/swaps'
import { db } from '../lib/db'
import { weekOf } from '../lib/plan'
import { buildReEntryDay } from '../lib/reentry'
import { deadlineViews, project } from '../lib/stats'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, DayStatus, TimeBucket } from '../lib/types'

const BUCKETS: { key: TimeBucket; label: string }[] = [
  { key: 'under10', label: 'under 10' },
  { key: '10to20', label: '10–20' },
  { key: '20to40', label: '20–40' },
  { key: '40plus', label: '40+' },
]

export function Today({ app, onGoTo }: { app: AppState; onGoTo: (v: 'drawer' | 'settings') => void }) {
  const { curriculum, plan, settings, refresh } = app
  const [note, setNote] = useState('')
  const [justDid, setJustDid] = useState<{ day: CurriculumDay; status: DayStatus } | null>(null)
  const [swapNote, setSwapNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [warnPublic, setWarnPublic] = useState(false)

  const reEntry =
    plan?.needsReEntry && plan.today && curriculum
      ? buildReEntryDay(curriculum, app.records, plan.today)
      : null
  const today = reEntry ?? plan?.today ?? null
  useEffect(() => { setNote(''); setSwapNote(null) }, [today?.dayId])
  useEffect(() => { void shouldWarnAboutPublicPhotos().then(setWarnPublic) }, [])

  if (!curriculum || !plan || !settings) return null

  if (justDid) {
    return <Recorded
      day={justDid.day}
      status={justDid.status}
      warnPublic={warnPublic}
      onPhotoChange={refresh}
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
          You have a record against every day in the plan. The drawer is full.
        </p>
      </div>
    )
  }

  const hue = phaseColour(today.phase)
  const act = activityOf(today.type)
  const ActIcon = act.icon
  const resource = today.resource ? curriculum.resources[today.resource.id] : null

  const urgent = deadlineViews(
    settings.deadlines, project(app.records).projectedFinish,
  ).filter((d) => d.urgent)

  const mark = async (status: DayStatus) => {
    setBusy(true)
    try {
      await markDay(today, { status, note })
      setJustDid({ day: today, status })
      void syncAfterCompletion()   // never blocks; the day is already on disk
    } finally {
      setBusy(false)
    }
  }

  const swap = async () => {
    const result = findSwap(curriculum, new Map(app.records.map((r) => [r.dayId, r])), today)
    if (!result) { setSwapNote('There is nothing lighter left in this phase to swap in.'); return }
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
      {/* The one exception to keeping everything quiet: a deadline inside
          sixty days pins here, and is allowed to be a little insistent. */}
      {urgent.length > 0 && (
        <div className="mb-8">
          {urgent.map((d) => (
            <p key={d.id} className="text-[15px]">
              <span className="font-display font-semibold text-p3">
                {d.daysLeft} days
              </span>{' '}
              until {d.school} closes. The programme is {d.programme}.
              {d.finishesBefore === false && (
                <span className="text-[var(--ink-2)]">
                  {' '}At your current pace, you will finish the year after that date.
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      {reEntry && (
        <div className="mb-8">
          <p className="max-w-[56ch] text-[15.5px]">
            You have been away for {plan.daysSinceLastWorked} days. Start with a short one.
            It takes ten minutes, covers nothing new, and counts as a full day. Day{' '}
            {plan.today?.day} will still be here afterwards.
          </p>
        </div>
      )}

      <div className="gap-8 sm:grid sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="font-display tnum text-[86px] leading-[0.86] font-bold tracking-[-0.04em] text-accent">
            {reEntry ? '\u2014' : String(today.day).padStart(3, '0')}
          </div>

          <h1 className="font-display mt-4 max-w-[22ch] text-[30px] leading-[1.08] font-semibold tracking-[-0.02em]">
            {today.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px]">
            <span
              className="font-display inline-flex items-center gap-[6px] rounded-full px-[11px] py-[4px] text-[12.5px] font-medium text-page"
              style={{ background: act.colour }}
            >
              <ActIcon size={14} strokeWidth={2.2} aria-hidden />
              {act.label}
            </span>
            <span className="font-display tnum inline-flex items-center gap-[5px] rounded-full bg-surface px-[11px] py-[4px] text-[12.5px] text-[var(--ink-2)]">
              <Clock3 size={14} strokeWidth={2} aria-hidden />
              {today.minutes} min
            </span>
            {today.isProjectBlock && (
              <span className="font-display rounded-full bg-surface px-[11px] py-[4px] text-[12.5px] text-[var(--ink-2)]">
                a longer session
              </span>
            )}
            {today.isDeload && (
              <span className="font-display rounded-full bg-surface px-[11px] py-[4px] text-[12.5px] text-[var(--ink-2)]">
                light week
              </span>
            )}
            {today.isBenchmark && (
              <span
                className="font-display rounded-full px-[11px] py-[3px] text-[12px] text-page"
                style={{ background: hue }}
              >
                benchmark day
              </span>
            )}
          </div>

          <div className="mt-6">
            <RecentStrip app={app} />
          </div>
        </div>

        {/* Six dividers, the current one out. */}
        <div className="mt-7 shrink-0 sm:mt-1">
          <PhaseRail app={app} current={today.phase} />
        </div>
      </div>

      {today.isBenchmark && (
        <div className="mt-7 max-w-[66ch]">
          <Callout title="What a benchmark day is" tint="var(--color-p4)" strength={8}>
            <p className="max-w-[58ch] text-[15px]">
              You draw the same object on days 1, 90, 180, 270, and 365. Keep the
              conditions the same every time. Five drawings of one object across a year
              will tell you whether this is working. You can see them side by side on the
              Series tab.
            </p>
          </Callout>
        </div>
      )}

      <div className="mt-7 max-w-[66ch] space-y-3">
        <Callout title={`The full task (${today.minutes} minutes)`} tint="var(--color-accent)" strength={5}>
          <p className="max-w-[58ch] text-[16px] leading-[1.6]">{today.full}</p>
        </Callout>

        {!today.isRest && (
          <Callout title="If today is hard" tint="var(--color-p5)" strength={7}>
            <p className="max-w-[58ch] text-[15.5px] leading-[1.55]">{today.minimum}</p>
          </Callout>
        )}
      </div>

      {resource && today.resource && (
        <p className="mt-5 max-w-[58ch] text-[15px] text-[var(--ink-2)]">
          <span className="font-medium text-graphite">
            {today.resourceMode === 'assigned' ? 'You will need this today:' : 'You can look this up if you want to:'}
          </span>{' '}
          {resource.title}
          {today.resource.section ? `, ${today.resource.section}` : ''}
        </p>
      )}

      <div className="mt-8 max-w-[66ch]">
        <Callout
          title={today.question ? 'Something to think about while you work' : 'Your notes'}
          tint="var(--color-p2)"
          strength={9}
        >
          {today.question && (
            <p className="mb-4 max-w-[40ch] text-[19px] leading-[1.35] text-graphite">
              {today.question}
            </p>
          )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={today.question
          ? "Answer it here if you like, or just write what happened. Nobody reads this but you."
          : "What happened? Nobody reads this but you."}
        className="w-full max-w-[58ch] resize-y rounded-[9px] border border-[var(--rule-strong)] bg-white px-[13px] py-[10px] text-[15px] placeholder:text-[var(--ink-2)] focus:outline-none focus-visible:border-graphite"
      />
        </Callout>
      </div>

      {today.type === 'read' && (
        <>
          <SavedQueue onChange={() => void refresh()} />
          <FollowPrompt />
        </>
      )}

      {!today.isRest && (
        <PhotoStrip day={today} warnPublic={warnPublic} onChange={() => void refresh()} />
      )}

      <div className="mt-8 max-w-[66ch]">
        <Panel title="How did today go?">
          <ButtonRow>
            <Button primary disabled={busy} onClick={() => void mark('full')}>
              <Check size={16} strokeWidth={2.4} aria-hidden />
              {today.isRest ? 'Nothing today' : 'Done'}
            </Button>
            {!today.isRest && (
              <>
                <Button disabled={busy} onClick={() => void mark('minimum')}>
                  <Minus size={16} strokeWidth={2.4} aria-hidden />
                  Minimum done
                </Button>
                <Button
                  disabled={busy || plan.swapsLeft === 0}
                  title={plan.swapsLeft === 0 ? 'You get two swaps a week, and you have used both' : undefined}
                  onClick={() => void swap()}
                >
                  <Shuffle size={16} strokeWidth={2.2} aria-hidden />
                  Not this one today
                </Button>
                <Button disabled={busy} onClick={() => void mark('skipped')}>
                  <X size={16} strokeWidth={2.4} aria-hidden />
                  Skip
                </Button>
              </>
            )}
          </ButtonRow>

          {swapNote && <p className="mt-3 text-[14px]">{swapNote}</p>}

          <div className="tnum font-display mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--ink-2)]">
            <span>streak {plan.streak}</span>
            <span>grace {plan.graceRemaining} of {settings.graceBudget}</span>
            {!today.isRest && <span>swaps {plan.swapsLeft} of {settings.swapsPerWeek} this week</span>}
          </div>
        </Panel>
      </div>

      {today.isRest && <SundayPanel week={today.week} />}

      <NewsPanel />
    </article>
  )
}

/** The one considered moment: the cell fills, and nothing else moves. */
function Recorded({
  day, status, warnPublic, onTime, onSkipTime, onSeeDrawer, onPhotoChange,
}: {
  day: CurriculumDay
  status: DayStatus
  warnPublic: boolean
  onTime: (b: TimeBucket) => Promise<void>
  onSkipTime: () => Promise<void>
  onSeeDrawer: () => void
  onPhotoChange: () => void
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
        <div className="mt-10">
          <p className="font-display text-[16px] font-medium">How long did that actually take?</p>
          <div className="mt-4">
            <ButtonRow>
              {BUCKETS.map((b) => (
                <Button key={b.key} onClick={() => void onTime(b.key)}>{b.label}</Button>
              ))}
            </ButtonRow>
          </div>
          <p className="mt-3 max-w-[50ch] text-[14px] text-[var(--ink-2)]">
            The plan guessed {day.minutes} minutes. When you tell it the truth, it can show
            you which estimates are wrong.
          </p>
        </div>
      )}

      {status !== 'rest' && status !== 'skipped' && (
        <PhotoStrip day={day} warnPublic={warnPublic} onChange={onPhotoChange} />
      )}

      <NewsPanel />

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
