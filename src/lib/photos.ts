import { useEffect, useState } from 'react'
import { db } from './db'
import type { PhotoRecord } from './types'

export async function photosForDay(dayId: string): Promise<PhotoRecord[]> {
  return (await db()).getAllFromIndex('photos', 'dayId', dayId)
}

export async function allPhotoDayIds(): Promise<Set<string>> {
  const rows = await (await db()).getAll('photos')
  return new Set(rows.map((p) => p.dayId))
}

/** Object URLs are revoked on unmount; leaking them across a year of log
 *  scrolling is how a tab ends up holding a gigabyte. */
export function usePhotoUrls(dayId: string | null): string[] {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    let live = true
    const made: string[] = []
    if (!dayId) { setUrls([]); return }
    void photosForDay(dayId).then((photos) => {
      if (!live) return
      for (const p of photos) made.push(URL.createObjectURL(p.blob))
      setUrls(made)
    })
    return () => {
      live = false
      for (const url of made) URL.revokeObjectURL(url)
    }
  }, [dayId])
  return urls
}
