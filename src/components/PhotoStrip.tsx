import { useEffect, useRef, useState } from 'react'
import { addPhotoToDay, deletePhoto, markPublicPhotoWarningSeen } from '../lib/addPhoto'
import { formatBytes } from '../lib/images'
import { photosForDay } from '../lib/photos'
import { Button, ButtonRow } from './ui'
import type { CurriculumDay, PhotoRecord } from '../lib/types'

export function PhotoStrip({
  day, warnPublic, onChange,
}: {
  day: CurriculumDay
  warnPublic: boolean
  onChange?: () => void
}) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)

  const reload = async () => {
    const rows = await photosForDay(day.dayId)
    setPhotos(rows)
    setUrls((old) => {
      for (const url of old.values()) URL.revokeObjectURL(url)
      return new Map(rows.map((p) => [p.id, URL.createObjectURL(p.blob)]))
    })
  }

  useEffect(() => { void reload() }, [day.dayId])
  useEffect(() => () => { for (const url of urls.values()) URL.revokeObjectURL(url) }, [])

  const take = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setStatus(null)
    try {
      const lines: string[] = []
      for (const file of Array.from(files)) {
        const { record, originalBytes } = await addPhotoToDay(day, file)
        lines.push(
          `${formatBytes(originalBytes)} → ${formatBytes(record.bytes)} at ${record.width}×${record.height}`,
        )
      }
      setStatus(lines.join(' · '))
      if (warnPublic) { setShowWarning(true); await markPublicPhotoWarningSeen() }
      await reload()
      onChange?.()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 border-t border-[var(--rule)] pt-5">
      <div className="font-display text-[13px] font-semibold">
        Specimen {photos.length > 0 && `· ${photos.length}`}
      </div>

      {photos.length > 0 && (
        <div className="mt-3 inline-flex max-w-full flex-wrap gap-px bg-[var(--rule-strong)] p-px">
          {photos.map((p, i) => (
            <figure key={p.id} className="bg-paper">
              <img
                src={urls.get(p.id)}
                alt={`Day ${day.day}, photo ${i + 1}`}
                className="block max-h-[220px]"
              />
              <figcaption className="flex items-center justify-between gap-4 px-2 py-[6px]">
                <span className="font-display tnum text-[11px] text-[var(--ink-3)]">
                  Day {String(day.day).padStart(3, '0')} · {formatBytes(p.bytes)}
                  {p.uploadState === 'uploaded' ? ' · pushed'
                    : p.uploadState === 'failed' ? ' · queued' : ' · on this device'}
                </span>
                <button
                  onClick={() => void deletePhoto(p.id).then(reload).then(onChange)}
                  className="font-display text-[10px] text-[var(--ink-3)] underline underline-offset-2"
                >
                  remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ButtonRow>
          <Button disabled={busy} onClick={() => camera.current?.click()}>
            {busy ? 'Compressing' : 'Take a photo'}
          </Button>
          <Button disabled={busy} onClick={() => picker.current?.click()}>Choose a file</Button>
        </ButtonRow>
      </div>

      <input
        ref={camera} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = '' }}
      />
      <input
        ref={picker} type="file" accept="image/*" multiple
        className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = '' }}
      />

      {status && <p className="tnum font-display mt-3 text-[11px] text-[var(--ink-3)]">{status}</p>}

      {showWarning && (
        <div className="mt-4 border-l-2 border-cinnabar pl-[13px] text-[13px] text-[var(--ink-2)]">
          <p className="max-w-[56ch]">
            Once a GitHub token is set up, photos are pushed to a public repo and become
            publicly accessible URLs. That is deliberate — it means they survive a browser
            wipe and can be seen from any device. It also means not shooting with mail,
            screens or documents in frame.
          </p>
          <button
            onClick={() => setShowWarning(false)}
            className="font-display mt-2 text-[11px] underline underline-offset-4"
          >
            understood
          </button>
        </div>
      )}
    </div>
  )
}
