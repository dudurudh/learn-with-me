import { getSettings, saveSettings } from './db'
import { buildExport, importExport, parseExport, type ExportFile } from './backup'

const GIST_FILENAME = 'learn-with-me-progress.json'
const API = 'https://api.github.com'

export type SyncOutcome =
  | { status: 'off' }
  | { status: 'pushed'; at: string; records: number }
  | { status: 'pulled'; at: string; added: number; replaced: number; kept: number; from: string }
  | { status: 'already-current'; at: string }
  | { status: 'error'; message: string }

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function isConfigured(): Promise<boolean> {
  const s = await getSettings()
  return Boolean(s.gistToken && s.gistId)
}

/** Creates the secret Gist for you so there is no copying of ids by hand.
 *  Secret means unlisted, not private — anyone with the URL can read it, which
 *  is why the id is the thing you keep to yourself. */
export async function createSecretGist(): Promise<string> {
  const settings = await getSettings()
  if (!settings.gistToken) throw new Error('Add a token with gist scope first.')
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: { ...headers(settings.gistToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'learn-with-me progress (secret)',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify({ placeholder: true }) } },
    }),
  })
  if (!res.ok) throw new Error(await message(res))
  const gist = (await res.json()) as { id: string }
  await saveSettings({ gistId: gist.id })
  return gist.id
}

async function message(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (res.status === 401) return 'The token was rejected. It needs the gist scope.'
  if (res.status === 404) return 'No Gist with that id, or the token cannot see it.'
  return `${res.status} ${body.message ?? res.statusText}`
}

/**
 * Photos are excluded on purpose: a year of them is 100+ MB and a Gist is not
 * a photo store. Photos go to the repo, progress goes here.
 */
export async function pushToGist(): Promise<SyncOutcome> {
  const settings = await getSettings()
  if (!settings.gistToken || !settings.gistId) return { status: 'off' }
  try {
    const payload = await buildExport(false)
    const res = await fetch(`${API}/gists/${settings.gistId}`, {
      method: 'PATCH',
      headers: { ...headers(settings.gistToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } },
      }),
    })
    if (!res.ok) return { status: 'error', message: await message(res) }
    const at = new Date().toISOString()
    await saveSettings({ lastSyncAt: at })
    return { status: 'pushed', at, records: payload.counts.progress }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

export async function pullFromGist(): Promise<SyncOutcome> {
  const settings = await getSettings()
  if (!settings.gistToken || !settings.gistId) return { status: 'off' }
  try {
    const res = await fetch(`${API}/gists/${settings.gistId}`, { headers: headers(settings.gistToken) })
    if (!res.ok) return { status: 'error', message: await message(res) }

    const gist = (await res.json()) as {
      files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>
    }
    const file = gist.files[GIST_FILENAME]
    if (!file) return { status: 'error', message: 'That Gist has no progress file in it yet.' }

    // Files over 1 MB come back truncated and have to be fetched raw.
    const raw = file.truncated && file.raw_url
      ? await (await fetch(file.raw_url)).text()
      : file.content ?? ''
    if (!raw || raw.includes('"placeholder"')) {
      return { status: 'error', message: 'That Gist is still empty. Push first.' }
    }

    const incoming: ExportFile = parseExport(raw)
    // Per-record last-write-wins rather than whole-file: importing the phone's
    // copy must never delete a day only the laptop knows about.
    const report = await importExport(incoming, 'merge')
    const at = new Date().toISOString()
    await saveSettings({ lastSyncAt: at })

    if (report.progressAdded === 0 && report.progressReplaced === 0) {
      return { status: 'already-current', at }
    }
    return {
      status: 'pulled', at,
      added: report.progressAdded,
      replaced: report.progressReplaced,
      kept: report.progressKept,
      from: report.fromDevice,
    }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

/** Fire-and-forget after a day is marked. Never blocks the write, never
 *  surfaces an error on the Today view — the day is already safe locally. */
export async function syncAfterCompletion(): Promise<void> {
  const settings = await getSettings()
  if (!settings.gistAutoSync) return
  await pushToGist().catch(() => undefined)
}
