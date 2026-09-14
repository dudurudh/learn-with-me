import { db, getSettings } from './db'
import type { PhotoRecord } from './types'

/** `progress-photos/day-047.jpg`, with a letter suffix once there is more
 *  than one on a day. Stable, sortable, and readable in the repo listing. */
export function remotePathFor(day: number, indexOnDay: number): string {
  const n = String(day).padStart(3, '0')
  const suffix = indexOnDay === 0 ? '' : `-${String.fromCharCode(97 + indexOnDay)}`
  return `progress-photos/day-${n}${suffix}.jpg`
}

export function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
  const match = /^([\w.-]+)\/([\w.-]+)$/.exec(cleaned)
  return match ? { owner: match[1], repo: match[2] } : null
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export interface FlushResult {
  uploaded: number
  failed: number
  skipped: 'no-token' | 'offline' | null
  lastError?: string
}

/**
 * Photos are already safe in IndexedDB before this runs. A failure here queues
 * for retry and never touches the local copy — losing a sketch because GitHub
 * was unreachable would be the worst possible trade.
 */
export async function flushUploadQueue(): Promise<FlushResult> {
  const settings = await getSettings()
  const repo = parseRepo(settings.githubRepo)
  if (!settings.githubToken || !repo) {
    return { uploaded: 0, failed: 0, skipped: 'no-token' }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { uploaded: 0, failed: 0, skipped: 'offline' }
  }

  const database = await db()
  const pending = (await database.getAll('photos'))
    .filter((p) => p.uploadState !== 'uploaded')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  let uploaded = 0
  let failed = 0
  let lastError: string | undefined

  for (const photo of pending) {
    try {
      await uploadOne(photo, repo, settings.githubToken)
      uploaded++
    } catch (e) {
      failed++
      lastError = e instanceof Error ? e.message : String(e)
      await database.put('photos', { ...photo, uploadState: 'failed' })
      // One bad response usually means the token or repo is wrong for all of
      // them; hammering the API 300 times would only get us rate-limited.
      break
    }
  }
  return { uploaded, failed, skipped: null, lastError }
}

async function uploadOne(
  photo: PhotoRecord,
  repo: { owner: string; repo: string },
  token: string,
): Promise<void> {
  const database = await db()
  const path = photo.remotePath ?? remotePathFor(0, 0)
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // An existing file needs its blob sha, or the API refuses the update.
  let sha: string | undefined
  const head = await fetch(url, { headers })
  if (head.ok) sha = ((await head.json()) as { sha?: string }).sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Add ${path}`,
      content: await blobToBase64(photo.blob),
      ...(sha ? { sha } : {}),
    }),
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(`${res.status} ${detail.message ?? res.statusText}`)
  }
  await database.put('photos', { ...photo, uploadState: 'uploaded' })
}

export async function queueCounts(): Promise<{ local: number; failed: number; uploaded: number }> {
  const rows = await (await db()).getAll('photos')
  return {
    local: rows.filter((p) => p.uploadState === 'local' || p.uploadState === 'queued').length,
    failed: rows.filter((p) => p.uploadState === 'failed').length,
    uploaded: rows.filter((p) => p.uploadState === 'uploaded').length,
  }
}
