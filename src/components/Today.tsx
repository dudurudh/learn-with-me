import { useEffect, useState } from 'react'
import { Button, ButtonRow } from './ui'
import { PhotoStrip } from './PhotoStrip'
import { RecentStrip } from './RecentStrip'
import { NewsPanel, SavedQueue } from './NewsPanel'
import { FollowPrompt } from './FollowPrompt'
import { SundayPanel } from './SundayPanel'
import { markDay } from '../lib/progress'
import { syncAfterCompletion } from '../lib/gist'
import { shouldWarnAboutPublicPhotos } from '../lib/addPhoto'
import { findSwap } from '../lib/plan'
import { addSwap } from '../lib/swaps'
import { db } from '../lib/db'
import { phaseOf } from '../lib/curriculum'
import { weekOf } from '../lib/plan'
import { buildReEntryDay } from '../lib/reentry'
import { deadlineViews, project } from '../lib/stats'
import type { AppState } from '../lib/useApp'
import type { CurriculumDay, DayStatus, Settings, TimeBucket } from '../lib/types'

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
      settings={settings}
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
          Every day in the plan has a record against it. The drawer is full.
        </p>
      </div>
    )
  }

  const phase = phaseOf(curriculum, today.day)
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
      {/* The one exception to keeping everything quiet: a deadline inside
          sixty days pins here, and is allowed to be a little insistent. */}
      {urgent.length > 0 && (
        <div className="mb-7 border-l-2 border-cinnabar pl-[13px]">
          {urgent.map((d) => (
            <p key={d.id} className="text-[13.5px]">
              <span className="font-display tnum font-semibold">{d.daysLeft} days</span>
              {' '}to {d.school} &mdash; {d.programme}
              {d.finishesBefore === false && (
                <span className="text-[var(--ink-2)]">
                  {' '}&middot; at your current rate you finish after it
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      {reEntry && (
        <div className="mb-7 border-b border-[var(--rule)] pb-5">
          <div className="font-display text-[13px] font-semibold">Coming back</div>
          <p className="mt-2 max-w-[56ch] text-[13.5px] text-[var(--ink-2)]">
            It has been {plan.daysSinceLastWorked} days. Here is a short one first &mdash; ten
            minutes, nothing new, and it counts as a full day. Day {plan.today?.day} is waiting
            after it and it is not going anywhere.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-display text-[13px] text-[var(--ink-3)]">
            Phase {today.phase} &middot; {phase?.title}
          </div>

          <div className="font-display tnum mt-3 text-[86px] leading-[0.86] font-bold tracking-[-0.04em] text-foam-deep">
            {reEntry ? '\u2014' : String(today.day).padStart(3, '0')}
          </div>
        </div>

        {/* The last nine weeks, on the page you open every day. Small enough
            to sit beside the number on a phone as well as a desk. */}
        <div className="mt-1 shrink-0">
          <RecentStrip app={app} />
        </div>
      </div>

      <h1 className="font-display mt-5 max-w-[22ch] text-[30px] leading-[1.08] font-semibold tracking-[-0.02em]">
        {today.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-[var(--ink-2)]">
        <span>{today.type}</span>
        <span className="text-[var(--marker)]">/</span>
        <span className="tnum">{today.minutes} minutes</span>
        {today.isProjectBlock && (
          <><span className="text-[var(--marker)]">/</span><span>the long one</span></>
        )}
        {today.isDeload && (
          <><span className="text-[var(--marker)]">/</span><span>light week</span></>
        )}
        {today.isBenchmark && (
          <span className="font-display bg-cinnabar px-[7px] py-[2px] text-[11px] text-paper">
            benchmark
          </span>
        )}
      </div>

      <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.62]">{today.full}</p>

      {today.question && (
        <p className="mt-9 max-w-[26ch] border-l-[3px] border-cinnabar pl-5 text-[21px] italic leading-[1.34] text-graphite">
          {today.question}
        </p>
      )}

      <div className="mt-10 border-t border-[var(--rule)] pt-4">
        <div className="font-display text-[13px] font-semibold">If today is a bad day</div>
        <p className="mt-1 max-w-[56ch] text-[14.5px] text-[var(--ink-2)]">{today.minimum}</p>
      </div>

      {resource && today.resource && (
        <p className="mt-5 text-[12.5px] text-[var(--ink-3)]">
          <span
            className={
              'font-display mr-[7px] border border-[var(--rule-strong)] px-[6px] py-[1px] text-[11px] ' +
              (today.resourceMode === 'assigned' ? 'border-transparent bg-graphite text-paper' : '')
            }
          >
            {today.resourceMode}
          </span>
          {resource.title}
          {today.resource.section ? ` — ${today.resource.section}` : ''}
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What happened? (optional, and nobody reads it but you)"
        className="mt-7 w-full max-w-[60ch] resize-y border-l-2 border-[var(--marker)] bg-transparent pl-[13px] text-[13.5px] italic text-[var(--ink-2)] placeholder:text-[var(--ink-3)] focus:outline-none focus-visible:border-graphite"
      />

      {today.type === 'read' && (
        <>
          <SavedQueue onChange={() => void refresh()} />
          <FollowPrompt />
        </>
      )}

      {!today.isRest && (
        <PhotoStrip day={today} warnPublic={warnPublic} onChange={() => void refresh()} />
      )}

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

      <div className="tnum font-display mt-5 flex flex-wrap gap-x-7 gap-y-1 text-[12.5px] text-[var(--ink-3)]">
        <span>streak {plan.streak}</span>
        <span>grace {plan.graceRemaining} of {settings.graceBudget}</span>
        {!today.isRest && <span>swaps {plan.swapsLeft} of {settings.swapsPerWeek} this week</span>}
      </div>

      {today.isRest && <SundayPanel week={today.week} />}

      <NewsPanel
        settings={settings}
        dayDone={false}
        onSettingsChange={() => void refresh()}
        onOpenSettings={() => onGoTo('settings')}
      />
    </article>
  )
}

/** The one considered moment: the cell fills, and nothing else moves. */
function Recorded({
  day, status, warnPublic, settings, onTime, onSkipTime, onSeeDrawer, onPhotoChange,
}: {
  day: CurriculumDay
  status: DayStatus
  warnPublic: boolean
  settings: Settings
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
        <div className="mt-9">
          <div className="font-display text-[13px] font-semibold">How long did it actually take?</div>
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

      {status !== 'rest' && status !== 'skipped' && (
        <PhotoStrip day={day} warnPublic={warnPublic} onChange={onPhotoChange} />
      )}

      <NewsPanel settings={settings} dayDone onSettingsChange={onPhotoChange} />

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
