import { useEffect, useRef, useState } from 'react'
import { addPhotoToDay, deletePhoto, markPublicPhotoWarningSeen } from '../lib/addPhoto'
import { formatBytes } from '../lib/images'
import { photosForDay } from '../lib/photos'
import { Button } from './ui'
import { Camera } from 'lucide-react'
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
    <div className="mt-10">
      <p className="font-display text-[15px] font-medium text-[var(--ink-2)]">
        {photos.length > 0
          ? `You have ${photos.length} photo${photos.length === 1 ? '' : 's'} from this day.`
          : 'Take a photo of the page. Bad pages count too.'}
      </p>

      {photos.length > 0 && (
        <div className="mt-3 inline-flex max-w-full flex-wrap gap-px bg-[var(--rule-strong)] p-px">
          {photos.map((p, i) => (
            <figure key={p.id} className="bg-page">
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

      <div className="mt-3">
        <Button disabled={busy} onClick={() => picker.current?.click()}>
          <Camera size={16} strokeWidth={2.2} aria-hidden />
          {busy ? 'Compressing' : photos.length > 0 ? 'Add another' : 'Add a photo'}
        </Button>
      </div>

      <input
        ref={picker} type="file" accept="image/*" multiple
        className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = '' }}
      />

      {status && <p className="tnum font-display mt-3 text-[11px] text-[var(--ink-3)]">{status}</p>}

      {showWarning && (
        <div className="mt-5 max-w-[58ch] rounded-[8px] border border-[var(--rule-strong)] p-4 text-[14px] text-[var(--ink-2)]">
          <p className="max-w-[56ch]">
            When you set up a GitHub token, the app pushes your photos to a public
            repository. Anyone with the link can then open them. This is deliberate. It
            means your photos survive if you clear the browser, and you can see them from
            any device. It also means you should keep mail, screens, and documents out of
            the frame.
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
