import { db } from './db'

export interface Story {
  title: string; link: string; source: string; sourceId: string
  publishedAt: string | null; summary: string; supplementary: boolean
}
export interface NewsFile {
  schemaVersion: number; generatedAt: string; feedsTried: number
  digests: { date: string; stories: Story[] }[]
}
export interface Designer {
  id: string; week: number; name: string; nationality: string; region: string
  era: string; discipline: string; keyWorks: string[]; whyTheyMatter: string
  searchQuery: string; needsFillingIn: boolean
}
export interface ProgramResult {
  id: string; name: string; kind: 'school' | 'funding'; url: string | null
  status: string; message?: string; added?: string[]; removed?: string[]
}

async function loadJson<T>(name: string, base = import.meta.env.BASE_URL): Promise<T | null> {
  try {
    const res = await fetch(`${base}${name}`)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null   // offline before the service worker has it, or not generated yet
  }
}

export const loadNews = () => loadJson<NewsFile>('news.json')
export const loadDesigners = () => loadJson<{ designers: Designer[] }>('designers.json')
export const loadProgramChanges = () => loadJson<{ generatedAt: string; results: ProgramResult[] }>('program-changes.json')

// ── saved reading queue ───────────────────────────────────────────────
export interface SavedStory extends Story { savedAt: string; readAt: string | null }

export async function savedStories(): Promise<SavedStory[]> {
  return ((await (await db()).get('kv', 'saved')) as SavedStory[] | undefined) ?? []
}
export async function saveStory(story: Story): Promise<SavedStory[]> {
  const current = await savedStories()
  if (current.some((s) => s.link === story.link)) return current
  const next = [...current, { ...story, savedAt: new Date().toISOString(), readAt: null }]
  await (await db()).put('kv', next, 'saved')
  return next
}
export async function unsaveStory(link: string): Promise<SavedStory[]> {
  const next = (await savedStories()).filter((s) => s.link !== link)
  await (await db()).put('kv', next, 'saved')
  return next
}
export async function markStoryRead(link: string): Promise<SavedStory[]> {
  const next = (await savedStories()).map((s) =>
    s.link === link ? { ...s, readAt: new Date().toISOString() } : s)
  await (await db()).put('kv', next, 'saved')
  return next
}

// ── follow list ───────────────────────────────────────────────────────
export async function followed(): Promise<string[]> {
  return ((await (await db()).get('kv', 'followed')) as string[] | undefined) ?? []
}
export async function toggleFollow(id: string): Promise<string[]> {
  const current = await followed()
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  await (await db()).put('kv', next, 'followed')
  return next
}

export function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000
  if (Number.isNaN(hours)) return ''
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.round(hours)}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
