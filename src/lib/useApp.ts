import { useCallback, useEffect, useState } from 'react'
import { loadCurriculum } from './curriculum'
import { getSettings } from './db'
import { allProgress, allResourceStates } from './progress'
import { planState, type PlanState } from './plan'
import { getSwaps, type Swap } from './swaps'
import { pullFromGist } from './gist'
import type { Curriculum, ProgressRecord, ResourceState, Settings } from './types'

export interface AppState {
  curriculum: Curriculum | null
  records: ProgressRecord[]
  settings: Settings | null
  swaps: Swap[]
  resourceStates: Map<string, ResourceState>
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
  const [swaps, setSwaps] = useState<Swap[]>([])
  const [resourceStates, setResourceStates] = useState<Map<string, ResourceState>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [c, r, s, w, res] = await Promise.all([
        loadCurriculum(), allProgress(), getSettings(), getSwaps(), allResourceStates(),
      ])
      setCurriculum(c)
      setRecords(r)
      setSettings(s)
      setSwaps(w)
      setResourceStates(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Read local first so the app is usable immediately, then pull and
    // re-read. A failed or unconfigured sync changes nothing.
    void refresh().then(async () => {
      const outcome = await pullFromGist()
      if (outcome.status === 'pulled') await refresh()
    })
  }, [refresh])

  return {
    curriculum, records, settings, swaps, resourceStates, error, loading, refresh,
    plan: curriculum && settings ? planState(curriculum, records, settings, swaps) : null,
  }
}
