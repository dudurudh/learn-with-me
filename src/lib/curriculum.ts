import type { Curriculum, CurriculumDay } from './types'

let cache: Curriculum | null = null

/** Same-origin, cached by the service worker, editable on github.com. */
export async function loadCurriculum(base = import.meta.env.BASE_URL): Promise<Curriculum> {
  if (cache) return cache
  const res = await fetch(`${base}curriculum.json`)
  if (!res.ok) throw new Error(`curriculum.json returned ${res.status}`)
  cache = (await res.json()) as Curriculum
  return cache
}

export function dayById(curriculum: Curriculum, dayId: string): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.dayId === dayId)
}

export function phaseOf(curriculum: Curriculum, day: number) {
  return curriculum.phases.find((p) => day >= p.dayStart && day <= p.dayEnd)
}
