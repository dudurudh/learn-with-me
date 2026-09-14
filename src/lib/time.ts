/** The day boundary is 04:00 by default, not midnight: a session that runs to
 *  00:20 belongs to the day it felt like, not the one the clock says. */
export function planDate(at: Date, boundaryHour: number): string {
  const d = new Date(at)
  if (d.getHours() < boundaryHour) d.setDate(d.getDate() - 1)
  return toISODate(d)
}

export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + 'T00:00:00')
  const b = Date.parse(bISO + 'T00:00:00')
  return Math.round((b - a) / 86_400_000)
}

export function daysSince(iso: string | null, now = new Date()): number | null {
  if (!iso) return null
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return null
  return Math.floor((now.getTime() - then) / 86_400_000)
}
