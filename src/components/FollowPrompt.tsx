import { useEffect, useState } from 'react'
import { followed, loadDesigners, type Designer } from '../lib/extras'

/**
 * The follow list earning its keep: on a read day with an empty article queue,
 * the assignment becomes twenty minutes with someone you already marked as
 * worth looking at.
 */
export function FollowPrompt() {
  const [picks, setPicks] = useState<Designer[]>([])

  useEffect(() => {
    void Promise.all([followed(), loadDesigners()]).then(([ids, file]) => {
      if (!file || ids.length === 0) return
      setPicks(file.designers.filter((d) => ids.includes(d.id)))
    })
  }, [])

  if (picks.length === 0) return null
  // Rotates by the day rather than at random, so it does not change under you
  // if the page re-renders mid-task.
  const pick = picks[new Date().getDate() % picks.length]

  return (
    <div className="mt-6 border-t border-[var(--rule)] pt-4">
      <div className="font-display text-[10px] tracking-[0.03em] text-[var(--ink-3)]">
        FROM YOUR FOLLOW LIST &middot; {picks.length}
      </div>
      <p className="mt-2 max-w-[56ch] text-[13.5px]">
        Spend twenty minutes looking at the work of <b>{pick.name}</b>. Two sentences in the
        notes on what you would steal.
      </p>
      <a
        href={`https://duckduckgo.com/?q=${encodeURIComponent(pick.searchQuery)}`}
        target="_blank" rel="noreferrer noopener"
        className="font-display mt-3 inline-block border border-[var(--rule-strong)] px-[14px] py-[8px] text-[12.5px] font-medium hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]"
      >
        Go and look
      </a>
    </div>
  )
}
