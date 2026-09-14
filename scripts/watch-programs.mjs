#!/usr/bin/env node
/**
 * Diffs admissions and funding pages week over week. It deliberately does NOT
 * parse them into fields — a scraper that turns a page into {deadline: "..."}
 * breaks silently the moment a school restructures, and a silently wrong
 * deadline is the worst possible failure here. Instead: strip to text, diff
 * against last week, and surface WHAT CHANGED with a link.
 */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const LIST = JSON.parse(await readFile('public/programs.json', 'utf8'))
const SNAP_DIR = 'snapshots'
const OUT = 'public/program-changes.json'
const KEEP_WEEKS = 8
const UA = 'learn-with-me-watch/1.0 (+https://github.com/dudurudh/learn-with-me)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
}

/** Lines present now that were not there last week, and the reverse. */
function diffLines(before, after) {
  const beforeSet = new Set(before.split('\n'))
  const afterSet = new Set(after.split('\n'))
  const added = after.split('\n').filter((l) => !beforeSet.has(l) && l.length > 12)
  const removed = before.split('\n').filter((l) => !afterSet.has(l) && l.length > 12)
  return { added, removed }
}

const INTERESTING = /deadline|apply|application|due|fellowship|assistantship|scholarship|funding|tuition|portfolio|requirement|GRE|statement|priority date/i

async function check(entry, kind) {
  const base = { id: entry.id, name: entry.school ?? entry.name, kind, url: entry.url }
  if (!entry.url) {
    return { ...base, status: 'no-url', message: 'No URL set for this one yet.' }
  }
  if (entry.urlConfirmed === false) {
    // Watching a homepage produces noise, not deadlines. Say so rather than
    // pretending a real check happened.
    return {
      ...base, status: 'unconfirmed',
      message: 'This is the school domain, not a confirmed admissions page. Replace the url in programs.json and set urlConfirmed to true.',
    }
  }
  try {
    const res = await fetch(entry.url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
    if (!res.ok) {
      return { ...base, status: 'check-manually', message: `The page returned ${res.status}. Check it yourself — a site restructure is exactly how a deadline gets missed.` }
    }
    const text = toText(await res.text())
    const file = join(SNAP_DIR, `${entry.id}.txt`)
    let previous = null
    try { previous = await readFile(file, 'utf8') } catch { /* first run */ }
    await writeFile(file, text)

    if (previous === null) return { ...base, status: 'first-run', message: 'Baseline saved. Changes show from next week.' }
    if (createHash('sha1').update(previous).digest('hex')
      === createHash('sha1').update(text).digest('hex')) {
      return { ...base, status: 'unchanged' }
    }
    const { added, removed } = diffLines(previous, text)
    const notable = added.filter((l) => INTERESTING.test(l)).slice(0, 6)
    return {
      ...base,
      status: notable.length ? 'changed-notable' : 'changed',
      added: notable.length ? notable : added.slice(0, 4),
      removed: removed.filter((l) => INTERESTING.test(l)).slice(0, 4),
    }
  } catch (e) {
    return { ...base, status: 'check-manually', message: `Could not reach it (${e.message}).` }
  }
}

await mkdir(SNAP_DIR, { recursive: true })
const results = []
for (const school of LIST.schools) { results.push(await check(school, 'school')); await sleep(1500) }
for (const fund of LIST.funding)   { results.push(await check(fund, 'funding'));  await sleep(1500) }

// Keep snapshot history bounded so the repo does not bloat.
const files = await readdir(SNAP_DIR)
const known = new Set([...LIST.schools, ...LIST.funding].map((e) => `${e.id}.txt`))
for (const f of files) if (!known.has(f)) await unlink(join(SNAP_DIR, f))

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  keepWeeks: KEEP_WEEKS,
  results,
}
await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n')

const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {})
console.log('statuses:', counts)
