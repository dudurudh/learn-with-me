#!/usr/bin/env node
/**
 * Runs in GitHub Actions, never in the browser — every one of these feeds
 * blocks cross-origin requests, and public CORS proxies are rate-limited and
 * unreliable. The Action fetches server-side and commits the result, so the
 * app reads news.json same-origin with no key, no quota, and offline once the
 * service worker has it.
 */
import { readFile, writeFile } from 'node:fs/promises'
import Parser from 'rss-parser'

const FEEDS = JSON.parse(await readFile('public/feeds.json', 'utf8'))
const OUT = 'public/news.json'
const KEEP_DAYS = 7
const PER_DIGEST = 5
const MAX_PER_SOURCE = 2
const UA = 'learn-with-me-news/1.0 (+https://github.com/dudurudh/learn-with-me)'

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pull(feed, supplementary) {
  try {
    const parsed = await parser.parseURL(feed.url)
    const items = (parsed.items ?? []).map((item) => ({
      title: clean(item.title ?? ''),
      link: item.link ?? '',
      source: feed.name,
      sourceId: feed.id,
      publishedAt: item.isoDate ?? item.pubDate ?? null,
      summary: clean(item.contentSnippet ?? item.content ?? '').slice(0, 220),
      supplementary,
    }))
    console.log(`  ${feed.id}: ${items.length} items`)
    return items
  } catch (e) {
    // A dead feed costs us that source, not the run.
    console.log(`  ${feed.id}: skipped (${e.message})`)
    return []
  }
}

function clean(s) {
  return String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function hoursOld(iso, now) {
  if (!iso) return 9999
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 9999 : (now - t) / 3_600_000
}

/** Transparent and inspectable on purpose: recency, then relevance, then a
 *  hard cap on how much any one publication can take. */
function score(item, now) {
  const age = hoursOld(item.publishedAt, now)
  let s = age <= 24 ? 100 : age <= 48 ? 70 : age <= 96 ? 35 : 5

  const haystack = `${item.title} ${item.summary}`.toLowerCase()
  const hits = FEEDS.boost.filter((t) => haystack.includes(t.toLowerCase())).length
  // A story about industrial design says so somewhere. One with no boost term
  // at all is almost always architecture or interiors wearing a design byline.
  if (hits === 0) return -1000
  s += hits * 9
  for (const term of FEEDS.damp) if (haystack.includes(term.toLowerCase())) s -= 14

  // Google News queries carry most of the noise, so they start behind.
  if (item.supplementary) s -= 18
  return s
}

/** Same story across three publications should take one slot, not three. */
function dedupe(items) {
  const seen = []
  const out = []
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ')
      .filter((w) => w.length > 3)
    const clash = seen.find((prev) => {
      const shared = key.filter((w) => prev.includes(w)).length
      return shared >= 3 && shared / Math.max(1, Math.min(key.length, prev.length)) > 0.5
    })
    if (clash) continue
    seen.push(key)
    out.push(item)
  }
  return out
}

function selectFive(items, now) {
  const ranked = dedupe(
    items
      .filter((i) => i.link && i.title && hoursOld(i.publishedAt, now) <= 96)
      .map((i) => ({ ...i, score: score(i, now) }))
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score),
  )
  const perSource = new Map()
  const chosen = []
  for (const item of ranked) {
    const used = perSource.get(item.sourceId) ?? 0
    if (used >= MAX_PER_SOURCE) continue
    perSource.set(item.sourceId, used + 1)
    chosen.push(item)
    if (chosen.length === PER_DIGEST) break
  }
  return chosen
}

async function main() {
  const now = Date.now()
  const all = []
  for (const feed of FEEDS.primary) {
    all.push(...(await pull(feed, false)))
    await sleep(1000)                      // be a good citizen
  }
  for (const feed of FEEDS.supplementary) {
    all.push(...(await pull(feed, true)))
    await sleep(1000)
  }

  const today = new Date().toISOString().slice(0, 10)
  const stories = selectFive(all, now)
  console.log(`selected ${stories.length} of ${all.length}`)

  let previous = { digests: [] }
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'))
  } catch { /* first run */ }

  const digests = [
    { date: today, stories },
    ...(previous.digests ?? []).filter((d) => d.date !== today),
  ].slice(0, KEEP_DAYS)

  const next = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    feedsTried: FEEDS.primary.length + FEEDS.supplementary.length,
    digests,
  }

  // Only commit when the stories actually changed, so the repo does not get a
  // meaningless commit every morning.
  const before = JSON.stringify((previous.digests ?? []).map((d) => d.stories?.map((s) => s.link)))
  const after = JSON.stringify(digests.map((d) => d.stories?.map((s) => s.link)))
  if (before === after) {
    console.log('no change')
    process.exit(0)
  }
  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n')
  console.log('wrote', OUT)
}

await main()
