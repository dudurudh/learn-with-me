import { useEffect, useState } from 'react'
import { loadDesigners, followed, toggleFollow, type Designer } from '../lib/extras'

/** Something closed that you open, not a banner that announces itself. */
export function SundayPanel({ week }: { week: number }) {
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [open, setOpen] = useState(false)
  const [follows, setFollows] = useState<string[]>([])

  useEffect(() => {
    void loadDesigners().then((file) => {
      if (!file) return
      const index = ((week - 1) % file.designers.length + file.designers.length) % file.designers.length
      setDesigner(file.designers[index])
    })
    void followed().then(setFollows)
  }, [week])



  return (
    <section className="mt-12 border-t border-[var(--rule-strong)] pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="font-display flex w-full items-baseline justify-between gap-4 text-left text-[14px] font-semibold"
      >
        <span>Sunday drawer</span>
        <span>{open ? 'close' : 'open'}</span>
      </button>

      {open && (
        <div className="mt-6">
          {designer && (
            <article>
              <div className="font-display tnum text-[12.5px] text-[var(--ink-3)]">
                Week {designer.week} &middot; {designer.region}
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
                  className="font-display bg-page px-[14px] py-[9px] text-[12.5px] font-medium hover:bg-[color-mix(in_srgb,var(--phase)_16%,var(--color-page))]"
                >
                  Go and look at the work
                </a>
                <button
                  onClick={() => void toggleFollow(designer.id).then(setFollows)}
                  className={
                    'font-display px-[14px] py-[9px] text-[12.5px] font-medium ' +
                    (follows.includes(designer.id)
                      ? 'bg-accent text-page'
                      : 'bg-page hover:bg-[color-mix(in_srgb,var(--phase)_16%,var(--color-page))]')
                  }
                >
                  {follows.includes(designer.id) ? 'Following' : 'Follow'}
                </button>
              </div>
            </article>
          )}

          <p className="mt-10 border-t border-[var(--rule)] pt-4 text-[13px] text-[var(--ink-2)]">
            Deadlines, the school watchlist and funding live on the Schools tab, every day
            rather than only on Sundays.
          </p>
        </div>
      )}
    </section>
  )
}
