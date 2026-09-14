import { useEffect, useState } from 'react'
import {
  loadDesigners, loadProgramChanges, followed, toggleFollow, relativeTime,
  type Designer, type ProgramResult,
} from '../lib/extras'

/** Something closed that you open, not a banner that announces itself. */
export function SundayPanel({ week }: { week: number }) {
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [open, setOpen] = useState(false)
  const [follows, setFollows] = useState<string[]>([])
  const [changes, setChanges] = useState<{ generatedAt: string; results: ProgramResult[] } | null>(null)

  useEffect(() => {
    void loadDesigners().then((file) => {
      if (!file) return
      const index = ((week - 1) % file.designers.length + file.designers.length) % file.designers.length
      setDesigner(file.designers[index])
    })
    void followed().then(setFollows)
  }, [week])

  useEffect(() => { if (open) void loadProgramChanges().then(setChanges) }, [open])

  const notable = changes?.results.filter(
    (r) => r.status === 'changed-notable' || r.status === 'check-manually') ?? []
  const unconfirmed = changes?.results.filter((r) => r.status === 'unconfirmed') ?? []

  return (
    <section className="mt-12 border-t border-[var(--rule-strong)] pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="font-display flex w-full items-baseline justify-between gap-4 text-left text-[11px] tracking-[0.02em] text-[var(--ink-3)]"
      >
        <span>SUNDAY DRAWER</span>
        <span>{open ? 'CLOSE' : 'OPEN'}</span>
      </button>

      {open && (
        <div className="mt-6">
          {designer && (
            <article>
              <div className="font-display tnum text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
                WEEK {String(designer.week).padStart(2, '0')} &middot; {designer.region.toUpperCase()}
              </div>
              <h2 className="font-display mt-2 text-[23px] font-semibold tracking-[-0.012em]">
                {designer.name}
              </h2>
              <div className="mt-1 text-[12.5px] text-[var(--ink-2)]">
                {designer.nationality} &middot; {designer.era} &middot; {designer.discipline}
              </div>

              {designer.keyWorks.length > 0 ? (
                <ul className="mt-4 max-w-[52ch]">
                  {designer.keyWorks.map((w) => (
                    <li key={w} className="border-b border-[var(--rule)] py-[6px] text-[13.5px]">{w}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 max-w-[52ch] text-[13px] italic text-[var(--ink-3)]">
                  Key works left blank rather than guessed at. Look them up and add them to
                  designers.json.
                </p>
              )}

              <p className="mt-4 max-w-[56ch] text-[14px]">{designer.whyTheyMatter}</p>

              <div className="mt-5 flex w-max gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)]">
                <a
                  href={`https://duckduckgo.com/?q=${encodeURIComponent(designer.searchQuery)}`}
                  target="_blank" rel="noreferrer noopener"
                  className="font-display bg-paper px-[14px] py-[9px] text-[12.5px] font-medium hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]"
                >
                  Go and look at the work
                </a>
                <button
                  onClick={() => void toggleFollow(designer.id).then(setFollows)}
                  className={
                    'font-display px-[14px] py-[9px] text-[12.5px] font-medium ' +
                    (follows.includes(designer.id)
                      ? 'bg-foam-deep text-paper'
                      : 'bg-paper hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]')
                  }
                >
                  {follows.includes(designer.id) ? 'Following' : 'Follow'}
                </button>
              </div>
            </article>
          )}

          <div className="mt-12 border-t border-[var(--rule)] pt-5">
            <div className="font-display text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
              PROGRAMMES AND MONEY
              {changes && ` · CHECKED ${relativeTime(changes.generatedAt).toUpperCase()}`}
            </div>

            {!changes && (
              <p className="mt-3 text-[13px] text-[var(--ink-2)]">
                The weekly Action has not run yet, or has not been able to.
              </p>
            )}

            {changes && notable.length === 0 && (
              <p className="mt-3 text-[13px] text-[var(--ink-2)]">
                Nothing moved on the confirmed pages this week.
              </p>
            )}

            {notable.map((r) => (
              <div key={r.id} className="mt-4 border-l-2 border-cinnabar pl-[13px]">
                <div className="font-display text-[13.5px] font-semibold">
                  {r.name}
                  <span className="ml-2 text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
                    {r.status === 'check-manually' ? 'CHECK MANUALLY' : 'CHANGED'}
                  </span>
                </div>
                {r.message && <p className="mt-1 text-[13px] text-[var(--ink-2)]">{r.message}</p>}
                {r.added?.slice(0, 3).map((line) => (
                  <p key={line} className="mt-1 max-w-[60ch] text-[12.5px] text-[var(--ink-2)]">+ {line}</p>
                ))}
                {r.url && (
                  <a
                    href={r.url} target="_blank" rel="noreferrer noopener"
                    className="font-display mt-1 inline-block text-[11px] underline underline-offset-2"
                  >
                    open the page
                  </a>
                )}
              </div>
            ))}

            {unconfirmed.length > 0 && (
              <p className="mt-5 max-w-[60ch] text-[12.5px] text-[var(--ink-3)]">
                {unconfirmed.length} watchlist {unconfirmed.length === 1 ? 'entry is' : 'entries are'} still
                pointing at a school domain rather than a confirmed admissions page, so nothing is
                being diffed for them. Paste the real URLs into programs.json.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
