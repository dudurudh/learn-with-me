import { useEffect, useState } from 'react'
import { Button, ButtonRow, Field, Note, Section } from './ui'
import { StoragePanel } from './StoragePanel'
import { saveSettings } from '../lib/db'
import { setResourceState } from '../lib/progress'
import { clearSwaps } from '../lib/swaps'
import { flushUploadQueue, queueCounts } from '../lib/upload'
import { MECHANISMS, askForNotifications, downloadIcs, notificationState } from '../lib/reminders'
import { createSecretGist, pullFromGist, pushToGist, type SyncOutcome } from '../lib/gist'
import type { AppState } from '../lib/useApp'
import type { Holding } from '../lib/types'

const HOLDINGS: { key: Holding; label: string }[] = [
  { key: 'none', label: 'Need it' },
  { key: 'owned', label: 'Own it' },
  { key: 'borrowed', label: 'Borrowed' },
]

export function Settings({ app }: { app: AppState }) {
  const { curriculum, settings, refresh, plan } = app
  const [jump, setJump] = useState('')
  const [school, setSchool] = useState('')
  const [programme, setProgramme] = useState('')
  const [date, setDate] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)
  const [counts, setCounts] = useState({ local: 0, failed: 0, uploaded: 0 })
  const [notifyState, setNotifyState] = useState<string>(() => notificationState())
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const runSync = (fn: () => Promise<SyncOutcome>) => {
    setSyncing(true); setSyncMessage(null)
    void fn()
      .then((r) => {
        setSyncMessage(
          r.status === 'pushed' ? `Pushed ${r.records} days.`
            : r.status === 'pulled' ? `From ${r.from}: ${r.added} added, ${r.replaced} updated, ${r.kept} already newer here.`
              : r.status === 'already-current' ? 'Already up to date.'
                : r.status === 'off' ? 'Add a token and a Gist id first.'
                  : r.message,
        )
      })
      .finally(() => { setSyncing(false); void refresh() })
  }
  useEffect(() => { void queueCounts().then(setCounts) }, [app.records])
  if (!curriculum || !settings || !plan) return null

  const set = (patch: Parameters<typeof saveSettings>[0]) =>
    void saveSettings(patch).then(refresh)

  const num = (
    label: string, value: number, min: number, max: number,
    onChange: (n: number) => void, suffix?: string,
  ) => (
    <Field label={label}>
      <span className="flex items-baseline gap-2">
        <input
          type="number" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tnum font-display w-[70px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
        />
        {suffix && <span className="text-[12.5px] text-[var(--ink-3)]">{suffix}</span>}
      </span>
    </Field>
  )

  return (
    <>
      <h1 className="font-display mb-10 text-[26px] font-semibold tracking-[-0.015em]">Settings</h1>

      <Section n="00" title="The plan">
        {num('Day boundary', settings.dayBoundaryHour, 0, 12,
          (n) => set({ dayBoundaryHour: n }), '·  00 is midnight, 04 is the default')}
        {num('Grace budget', settings.graceBudget, 0, 7,
          (n) => set({ graceBudget: n }), `skips per ${settings.graceWindowDays} days`)}
        {num('Swaps', settings.swapsPerWeek, 0, 7,
          (n) => set({ swapsPerWeek: n }), 'not-this-one-todays per week')}
        <Field label="Reminder time">
          <input
            type="time" value={settings.reminderTime}
            onChange={(e) => set({ reminderTime: e.target.value })}
            className="tnum font-display border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>
        <label className="mb-3 flex items-start gap-2 text-[13.5px]">
          <input
            type="checkbox"
            className="mt-[4px]"
            checked={settings.newsGatedUntilComplete}
            onChange={(e) => set({ newsGatedUntilComplete: e.target.checked })}
          />
          <span className="max-w-[52ch]">
            Keep the news digest closed until the day is marked done
          </span>
        </label>

        <Note>
          A session at 23:30 should land on the day it felt like, and one at 00:20 should not
          break anything. The boundary hour decides which date a completion is stamped with.
        </Note>
      </Section>

      <Section n="00b" title="Jump to a day">
        <div className="flex flex-wrap items-baseline gap-3">
          <input
            type="number" min={1} max={365} value={jump} placeholder={String(plan.today?.day ?? 1)}
            onChange={(e) => setJump(e.target.value)}
            className="tnum font-display w-[90px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
          <ButtonRow>
            <Button
              disabled={!jump}
              onClick={() => { set({ floorDay: Math.max(1, Math.min(365, Number(jump))) }); setJump('') }}
            >
              Start from there
            </Button>
            {settings.floorDay > 1 && (
              <Button onClick={() => set({ floorDay: 1 })}>Back to day 1</Button>
            )}
          </ButtonRow>
        </div>
        <Note>
          {settings.floorDay > 1
            ? `Currently ignoring everything below day ${settings.floorDay}.`
            : 'Moves the starting point without inventing history — days below it are ignored rather than marked done.'}
        </Note>
      </Section>

      <Section n="00c" title="Swaps">
        <ButtonRow>
          <Button disabled={app.swaps.length === 0} onClick={() => void clearSwaps().then(refresh)}>
            Reset the running order
          </Button>
        </ButtonRow>
        <Note>
          {app.swaps.length === 0
            ? 'Nothing has been deferred. The year runs in its written order.'
            : `${app.swaps.length} day${app.swaps.length === 1 ? ' has' : 's have'} been swapped out of order.`}
        </Note>
      </Section>

      <Section n="00d" title="Books and courses">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {Object.entries(curriculum.resources).map(([id, meta]) => {
              const state = app.resourceStates.get(id)
              const holding = state?.holding ?? 'none'
              return (
                <tr key={id} className="border-b border-[var(--rule)] align-top">
                  <td className="py-3 pr-4">
                    <span className="font-display block text-[13.5px] font-semibold">{meta.title}</span>
                    <span className="font-display text-[10.5px] tracking-[0.03em] text-[var(--ink-3)]">
                      {meta.type} &middot;{' '}
                      <span className={meta.cost === 'paid' ? 'text-cinnabar' : ''}>{meta.cost}</span>
                      {meta.multiSession && ' · multi-session'}
                    </span>
                  </td>
                  <td className="w-px py-3">
                    <div className="flex w-max gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)]">
                      {HOLDINGS.map((h) => (
                        <button
                          key={h.key}
                          onClick={() => void setResourceState(id, { holding: h.key }).then(refresh)}
                          className={
                            'font-display px-[9px] py-[6px] text-[11px] ' +
                            (holding === h.key
                              ? 'bg-foam-deep text-paper'
                              : 'bg-paper text-[var(--ink-2)] hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]')
                          }
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                    {holding === 'borrowed' && (
                      <input
                        type="date"
                        value={state?.dueBack ?? ''}
                        onChange={(e) => void setResourceState(id, { dueBack: e.target.value }).then(refresh)}
                        className="tnum font-display mt-2 block w-full border-b border-[var(--rule-strong)] bg-transparent pb-[2px] text-[11px] focus:outline-none focus-visible:border-graphite"
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Note>
          Free or paid is a fact about the book and lives in curriculum.json. Whether you own it,
          borrowed it, or still need it is yours, so it lives here and travels in your backup.
          A borrowed book can carry a date back.
        </Note>
      </Section>

      <Section n="00h" title="Sync between your devices">
        <Field label="Token">
          <input
            type="password"
            placeholder="a token with gist scope"
            value={settings.gistToken}
            onChange={(e) => set({ gistToken: e.target.value })}
            className="w-full max-w-[280px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>
        <Field label="Secret Gist id">
          <input
            placeholder="paste one, or make one below"
            value={settings.gistId}
            onChange={(e) => set({ gistId: e.target.value })}
            className="tnum w-full max-w-[280px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>

        <div className="mt-4">
          <ButtonRow>
            <Button
              primary
              disabled={syncing || !settings.gistToken || !settings.gistId}
              onClick={() => runSync(pushToGist)}
            >
              {syncing ? 'Syncing' : 'Push to the Gist'}
            </Button>
            <Button
              disabled={syncing || !settings.gistToken || !settings.gistId}
              onClick={() => runSync(pullFromGist)}
            >
              Pull from the Gist
            </Button>
            <Button
              disabled={syncing || !settings.gistToken || Boolean(settings.gistId)}
              title={settings.gistId ? 'You already have one' : undefined}
              onClick={() => {
                setSyncing(true)
                void createSecretGist()
                  .then((id) => setSyncMessage(`Created a secret Gist: ${id}`))
                  .catch((e: Error) => setSyncMessage(e.message))
                  .finally(() => { setSyncing(false); refresh() })
              }}
            >
              Make me a secret Gist
            </Button>
          </ButtonRow>
        </div>

        {syncMessage && <p className="mt-3 text-[13px]">{syncMessage}</p>}

        <p className="tnum font-display mt-4 text-[12px] text-[var(--ink-3)]">
          {settings.lastSyncAt
            ? `LAST SYNCED ${new Date(settings.lastSyncAt).toLocaleString()}`
            : 'NEVER SYNCED'}
        </p>

        <label className="mt-4 flex items-start gap-2 text-[13.5px]">
          <input
            type="checkbox"
            className="mt-[4px]"
            checked={settings.gistAutoSync}
            onChange={(e) => set({ gistAutoSync: e.target.checked })}
          />
          <span className="max-w-[52ch]">Push automatically after each day is marked</span>
        </label>

        <Note>
          Optional, and the app works completely without it. Pulling happens once when the app
          loads; pushing happens after each completed day. Photos are excluded &mdash; a year of
          them is far too much for a Gist. They go to the repo instead.
        </Note>
        <Note>
          A conflict is resolved <b>per day, not per file</b>: whichever copy of a given day was
          completed later wins, and a day only one device knows about is never dropped. Straight
          last-write-wins on the whole file would delete real work the moment two devices are
          out of step.
        </Note>
        <Note>
          The token needs <code>gist</code> scope and nothing else. It is kept in this
          browser&rsquo;s IndexedDB and is never exported or committed &mdash; a real if modest
          risk, since anything that can run JavaScript on this origin could read it. A secret
          Gist is unlisted rather than private, so treat the id as the secret.
        </Note>
      </Section>

      <Section n="00g" title="Reminders">
        <p className="mb-5 max-w-[60ch] text-[13.5px] text-[var(--ink-2)]">
          A site on GitHub Pages cannot push you a notification. Of the three below, only
          two reach you when the app is closed, and the calendar one is the one that
          actually works.
        </p>

        <div className="mb-6 space-y-3">
          {MECHANISMS.map((m) => (
            <div key={m.id} className="border-l-2 pl-[13px]"
              style={{ borderColor: m.whenClosed ? 'var(--color-foam-deep)' : 'var(--color-marker)' }}>
              <div className="font-display text-[13.5px] font-semibold">
                {m.name}
                <span className="ml-2 text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
                  {m.whenClosed ? 'WORKS WHEN CLOSED' : 'ONLY WHILE OPEN'}
                </span>
              </div>
              <p className="mt-1 max-w-[58ch] text-[13px] text-[var(--ink-2)]">{m.summary}</p>
            </div>
          ))}
        </div>

        <ButtonRow>
          <Button
            primary
            onClick={() => downloadIcs({
              time: settings.reminderTime,
              appUrl: 'https://dudurudh.github.io/learn-with-me/',
            })}
          >
            Download the calendar file
          </Button>
          <Button
            onClick={() => void askForNotifications().then((r) => setNotifyState(String(r)))}
          >
            {notifyState === 'granted' ? 'Notifications allowed' : 'Allow browser notifications'}
          </Button>
        </ButtonRow>
        <p className="tnum font-display mt-3 text-[11px] text-[var(--ink-3)]">
          DAILY AT {settings.reminderTime} &middot; NOTIFICATIONS {String(notifyState).toUpperCase()}
        </p>

        <Field label="ntfy topic">
          <input
            placeholder="something-long-and-unguessable"
            value={settings.ntfyTopic}
            onChange={(e) => set({ ntfyTopic: e.target.value })}
            className="w-full max-w-[280px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>
        <Note>
          Four steps: install the ntfy app, subscribe to a topic name only you know, add that
          same name as a repository secret called <code>NTFY_TOPIC</code>, and the daily Action
          does the rest. The topic is a password in all but name &mdash; anyone who knows it can
          read your reminders or send you their own, so make it long. This field is a note to
          yourself; the Action reads the secret, not this.
        </Note>
      </Section>

      <Section n="00f" title="Application deadlines">
        {settings.deadlines.length > 0 && (
          <table className="mb-5 w-full border-collapse text-[13px]">
            <tbody>
              {[...settings.deadlines]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((d) => (
                  <tr key={d.id} className="border-b border-[var(--rule)]">
                    <td className="py-2 pr-3">
                      <span className="font-display block text-[13.5px] font-semibold">{d.school}</span>
                      <span className="text-[12px] text-[var(--ink-3)]">{d.programme}</span>
                    </td>
                    <td className="tnum font-display py-2 pr-3 text-right whitespace-nowrap">{d.date}</td>
                    <td className="w-px py-2">
                      <button
                        onClick={() => set({ deadlines: settings.deadlines.filter((x) => x.id !== d.id) })}
                        className="font-display text-[11px] text-[var(--ink-3)] underline underline-offset-2"
                      >
                        remove
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="font-display block text-[10px] tracking-[0.03em] text-[var(--ink-3)]">SCHOOL</span>
            <input
              value={school} onChange={(e) => setSchool(e.target.value)} placeholder="RISD"
              className="w-[150px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[14px] focus:outline-none focus-visible:border-graphite"
            />
          </label>
          <label className="block">
            <span className="font-display block text-[10px] tracking-[0.03em] text-[var(--ink-3)]">PROGRAMME</span>
            <input
              value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="MID"
              className="w-[150px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[14px] focus:outline-none focus-visible:border-graphite"
            />
          </label>
          <label className="block">
            <span className="font-display block text-[10px] tracking-[0.03em] text-[var(--ink-3)]">DEADLINE</span>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="tnum font-display border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[14px] focus:outline-none focus-visible:border-graphite"
            />
          </label>
          <ButtonRow>
            <Button
              disabled={!school || !date}
              onClick={() => {
                set({
                  deadlines: [...settings.deadlines, {
                    id: crypto.randomUUID(), school, programme, date, priority: 'medium' as const,
                  }],
                })
                setSchool(''); setProgramme(''); setDate('')
              }}
            >
              Add
            </Button>
          </ButtonRow>
        </div>

        <Note>
          A deadline inside sixty days pins to the top of the Today view. That is the one place
          the app is allowed to be a little insistent, and the Phase screen shows whether your
          projected Day 365 lands before or after each of these.
        </Note>
      </Section>

      <Section n="00e" title="Pushing photos to the repo">
        <Field label="Repository">
          <input
            placeholder="dudurudh/learn-with-me"
            value={settings.githubRepo}
            onChange={(e) => set({ githubRepo: e.target.value })}
            className="w-full max-w-[280px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>
        <Field label="Token">
          <input
            type="password"
            placeholder="github_pat_…"
            value={settings.githubToken}
            onChange={(e) => set({ githubToken: e.target.value })}
            className="w-full max-w-[280px] border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
          />
        </Field>

        <div className="mt-4">
          <ButtonRow>
            <Button
              disabled={pushing || !settings.githubToken}
              onClick={() => {
                setPushing(true)
                void flushUploadQueue()
                  .then((r) => {
                    setPushResult(
                      r.skipped === 'offline' ? 'Offline — the queue will keep.'
                        : r.skipped === 'no-token' ? 'No token or repository set.'
                          : r.failed > 0 ? `${r.uploaded} pushed, then stopped: ${r.lastError ?? 'unknown error'}`
                            : r.uploaded === 0 ? 'Nothing waiting.'
                              : `${r.uploaded} photo${r.uploaded === 1 ? '' : 's'} pushed.`,
                    )
                  })
                  .finally(() => { setPushing(false); void refresh() })
              }}
            >
              {pushing ? 'Pushing' : 'Push what is waiting'}
            </Button>
          </ButtonRow>
        </div>

        {pushResult && <p className="mt-3 text-[13px]">{pushResult}</p>}

        <p className="tnum font-display mt-4 text-[12px] text-[var(--ink-3)]">
          {counts.local} LOCAL &middot; {counts.failed} QUEUED &middot; {counts.uploaded} PUSHED
        </p>

        <Note>
          Use a <b>fine-grained</b> personal access token scoped to this one repository with
          contents: write &mdash; not a classic token with full repo scope. The token is kept in
          this browser&rsquo;s IndexedDB, which is a real if modest risk: anything that can run
          JavaScript here can read it. It is never exported and never committed.
        </Note>
        <Note>
          Photos land at <code>progress-photos/day-047.jpg</code> in a public repo, so they
          survive a browser wipe and can be seen from any device. The app works completely
          without this configured &mdash; photos simply stay on this device.
        </Note>
      </Section>

      <StoragePanel app={app} />
    </>
  )
}
