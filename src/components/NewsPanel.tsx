import { useEffect, useState } from 'react'
import { Panel } from './ui'
import {
  loadNews, savedStories, saveStory, unsaveStory, relativeTime,
  type NewsFile, type SavedStory,
} from '../lib/extras'

/** Always visible, and still below the task rather than above it — a feed is
 *  the easiest thing to do instead of drawing. */
export function NewsPanel() {
  const [open, setOpen] = useState(true)
  const [news, setNews] = useState<NewsFile | null>(null)
  const [saved, setSaved] = useState<SavedStory[]>([])

  useEffect(() => { if (!news) void loadNews().then(setNews) }, [news])
  useEffect(() => { void savedStories().then(setSaved) }, [])

  const digest = news?.digests?.[0]
  const staleHours = news ? (Date.now() - Date.parse(news.generatedAt)) / 3_600_000 : 0

  return (
    <div className="mt-14 max-w-[66ch]">
      <Panel
        title="Five things from the field"
        action={
          <button
            onClick={() => setOpen(!open)}
            className="font-display text-[13.5px] text-[var(--ink-2)] underline underline-offset-4 hover:text-graphite"
          >
            {open ? 'close' : 'open'}
          </button>
        }
      >


      {open && (
        <div>
          {!news && <p className="text-[13px] text-[var(--ink-2)]">Nothing fetched yet.</p>}

          {news && staleHours > 48 && (
            <p className="mb-4 text-[12px] text-[var(--ink-3)]">
              Last fetched {relativeTime(news.generatedAt)}. The Action may not have run.
            </p>
          )}

          {digest?.stories.map((story) => {
            const isSaved = saved.some((s) => s.link === story.link)
            return (
              <article key={story.link} className="border-b border-[var(--rule)] py-3">
                <a
                  href={story.link} target="_blank" rel="noreferrer noopener"
                  className="font-display block text-[14.5px] font-semibold hover:underline underline-offset-4"
                >
                  {story.title}
                </a>
                <div className="font-display mt-1 text-[11.5px] text-[var(--ink-3)]">
                  {story.source} &middot; {relativeTime(story.publishedAt)}
                </div>
                {story.summary && (
                  <p className="mt-1 max-w-[62ch] text-[13px] text-[var(--ink-2)]">{story.summary}</p>
                )}
                <button
                  onClick={() =>
                    void (isSaved ? unsaveStory(story.link) : saveStory(story)).then(setSaved)}
                  className="font-display mt-2 text-[11px] text-[var(--ink-3)] underline underline-offset-2"
                >
                  {isSaved ? 'saved for later' : 'save for later'}
                </button>
              </article>
            )
          })}

        </div>
      )}
      </Panel>
    </div>
  )
}

/** On a `read` day the queue is the assignment, which is the whole point of
 *  the save control: it turns scrolling into the deliberate reading the plan
 *  already asks for. */
export function SavedQueue({ onChange }: { onChange?: () => void }) {
  const [saved, setSaved] = useState<SavedStory[]>([])
  useEffect(() => { void savedStories().then(setSaved) }, [])
  const unread = saved.filter((s) => !s.readAt)
  if (unread.length === 0) return null   // FollowPrompt covers the empty case

  return (
    <div className="mt-6 border-t border-[var(--rule)] pt-4">
      <div className="font-display text-[13px] font-semibold">Your saved queue &middot; {unread.length}</div>
      <p className="mt-2 max-w-[56ch] text-[13.5px]">
        Read two of these properly and write three sentences on each in the notes. That is
        today&rsquo;s reading — the book can wait.
      </p>
      <ul className="mt-3">
        {unread.slice(0, 5).map((s) => (
          <li key={s.link} className="border-b border-[var(--rule)] py-2">
            <a
              href={s.link} target="_blank" rel="noreferrer noopener"
              className="font-display text-[13.5px] font-semibold hover:underline underline-offset-4"
            >
              {s.title}
            </a>
            <div className="font-display mt-[2px] text-[11.5px] text-[var(--ink-3)]">
              {s.source} &middot; saved {relativeTime(s.savedAt)}
              <button
                onClick={() => void unsaveStory(s.link).then((r) => { setSaved(r); onChange?.() })}
                className="ml-3 underline underline-offset-2"
              >
                remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
