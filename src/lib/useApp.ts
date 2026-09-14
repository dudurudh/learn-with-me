import { useCallback, useEffect, useState } from 'react'
import { loadCurriculum } from './curriculum'
import { getSettings } from './db'
import { allProgress } from './progress'
import { planState, type PlanState } from './plan'
import type { Curriculum, ProgressRecord, Settings } from './types'

export interface AppState {
  curriculum: Curriculum | null
  records: ProgressRecord[]
  settings: Settings | null
  plan: PlanState | null
  error: string | null
  loading: boolean
  /** Re-read everything from IndexedDB. Called after every write. */
  refresh: () => Promise<void>
}

export function useApp(): AppState {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [c, r, s] = await Promise.all([loadCurriculum(), allProgress(), getSettings()])
      setCurriculum(c)
      setRecords(r)
      setSettings(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return {
    curriculum, records, settings, error, loading, refresh,
    plan: curriculum && settings ? planState(curriculum, records, settings) : null,
  }
}
