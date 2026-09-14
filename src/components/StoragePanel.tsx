import { useRef, useState } from 'react'
import { Button, ButtonRow, Field, Note, Section } from './ui'
import { exportToFile, importExport, parseExport, type ImportMode, type ImportReport } from '../lib/backup'
import { clearDemoData, seedDemoData, SEED_THROUGH_DAY } from '../lib/seed'
import { db, saveSettings } from '../lib/db'
import type { AppState } from '../lib/useApp'
import { daysSince } from '../lib/time'

export function StoragePanel({ app }: { app: AppState }) {
  const { curriculum, settings, records, plan, refresh } = app
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [seedStage, setSeedStage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!settings || !curriculum) return null

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label); setMessage(null); setReport(null)
    try {
      setMessage(await fn())
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
      await refresh()
    }
  }

  const sinceExport = daysSince(settings.lastExportAt)
  const seededRows = records.filter((r) => r.seed).length

  return (
    <>
      <Section n="01" title="This device">
        <Field label="Name">
          <input
            className="border-b border-[var(--rule-strong)] bg-transparent pb-1 text-[15px] focus:outline-none focus-visible:border-graphite"
            value={settings.deviceName}
            onChange={(e) => { void saveSettings({ deviceName: e.target.value }).then(refresh) }}
          />
        </Field>
        <Field label="Holding">
          <span className="tnum font-display text-[15px]">
            {records.length} records &middot; {plan?.worked ?? 0} worked
          </span>
        </Field>
        <Field label="Last backup">
          <span className="tnum font-display text-[15px]">
            {settings.lastExportAt
              ? `${sinceExport} day${sinceExport === 1 ? '' : 's'} ago`
              : 'never'}
          </span>
        </Field>
        <Note>
          Your progress lives only in this browser, on this device. It is never committed to
          the repo. If you use the app on a phone and a laptop, each keeps its own copy until
          you export from one and import to the other &mdash; which is why the import below
          merges rather than overwrites by default.
        </Note>
      </Section>

      <Section n="02" title="Backup">
        <ButtonRow>
          <Button primary onClick={() => void run('export', async () => {
            const file = await exportToFile()
            return file.photosIncluded
              ? `Exported ${file.counts.progress} days and ${file.counts.photos} photos.`
              : `Exported ${file.counts.progress} days. ${file.photosOmittedReason ?? ''}`
          })}>
            {busy === 'export' ? 'Exporting' : 'Export a backup'}
          </Button>
          <Button onClick={() => fileInput.current?.click()}>Import a backup</Button>
        </ButtonRow>

        <div className="mt-4 flex items-center gap-4 text-[13px] text-[var(--ink-2)]">
          <span className="font-display text-[12.5px] text-[var(--ink-3)]">On import</span>
          {(['merge', 'replace'] as ImportMode[]).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
              {m === 'merge'
                ? 'Keep whichever day was done later'
                : 'Replace everything here'}
            </label>
          ))}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            await run('import', async () => {
              const parsed = parseExport(await file.text())
              const r = await importExport(parsed, mode)
              setReport(r)
              return `Imported from ${r.fromDevice}.`
            })
          }}
        />

        {report && (
          <div className="tnum mt-4 border border-[var(--rule-strong)] p-3 text-[13px]">
            <div>{report.progressAdded} days added</div>
            <div>{report.progressReplaced} replaced with a later version</div>
            <div>{report.progressKept} kept because this device had a later one</div>
            {report.photosWritten > 0 && <div>{report.photosWritten} photos restored</div>}
          </div>
        )}

        <Note>
          The backup is a plain JSON file. It carries your progress, notes, resource states and
          settings &mdash; but never your GitHub or Gist tokens, because a backup is the file most
          likely to end up emailed to yourself.
        </Note>
      </Section>

      <Section n="03" title="Demo history">
        <ButtonRow>
          <Button
            disabled={settings.seeded}
            onClick={() => void run('seed', async () => {
              const r = await seedDemoData(curriculum, {
                withPhotos: true,
                onProgress: (done, total, stage) => {
                  setSeedStage(stage === 'days'
                    ? `${done} days in, drawing photos`
                    : `photo ${done} of ${total}`)
                  if (stage === 'days') void refresh()
                },
              })
              setSeedStage(null)
              return `Filled ${r.days} days with demo history and ${r.photos} photos.`
            })}
          >
            {busy === 'seed' ? (seedStage ?? 'Filling') : `Fill to day ${SEED_THROUGH_DAY}`}
          </Button>
          <Button
            disabled={!settings.seeded}
            onClick={() => void run('unseed', async () => {
              const r = await clearDemoData()
              return `Removed ${r.days} demo days and ${r.photos} demo photos.`
            })}
          >
            {busy === 'unseed' ? 'Removing' : 'Remove demo history'}
          </Button>
        </ButtonRow>

        {settings.seeded && (
          <p className="font-display mt-4 inline-block bg-cinnabar px-[8px] py-[3px] text-[12px] text-paper">
            Demo history is on &mdash; {seededRows} of these records are made up
          </p>
        )}

        <Note>
          Plausible fake history at day {SEED_THROUGH_DAY} &mdash; mixed full, minimum and
          skipped days, notes, photos, and one bad fortnight around day 130 &mdash; so you can
          see what the heatmap and log look like populated. It refuses to run if you have any
          real progress, and removing it deletes only the rows it created.
        </Note>
      </Section>

      <Section n="04" title="Start again">
        <ButtonRow>
          <Button onClick={() => void run('reset', async () => {
            const database = await db()
            const tx = database.transaction(['progress', 'photos', 'resources'], 'readwrite')
            await tx.objectStore('progress').clear()
            await tx.objectStore('photos').clear()
            await tx.objectStore('resources').clear()
            await tx.done
            await saveSettings({ seeded: false, completedSinceExport: 0 })
            return 'Everything removed. Day 1 again.'
          })}>
            Delete all progress
          </Button>
        </ButtonRow>
        <Note>
          This cannot be undone and there is no copy anywhere else. Export first.
        </Note>
      </Section>

      {message && (
        <p className="border-t border-[var(--rule-strong)] pt-4 text-[13.5px]">{message}</p>
      )}
    </>
  )
}
