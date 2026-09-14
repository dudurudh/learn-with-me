/** Colour says which phase; how filled the cell is says how far into that day
 *  you got. Six hues instead of six shades of one, because a year in a single
 *  colour reads as a spreadsheet. */
export const PHASE_COLOUR: Record<number, string> = {
  1: 'var(--color-p1)',
  2: 'var(--color-p2)',
  3: 'var(--color-p3)',
  4: 'var(--color-p4)',
  5: 'var(--color-p5)',
  6: 'var(--color-p6)',
}

export function phaseColour(phase: number): string {
  return PHASE_COLOUR[phase] ?? 'var(--color-p1)'
}

/** The fill for one cell, given its phase and what happened that day. */
export function cellFill(
  phase: number,
  status: 'full' | 'minimum' | 'skipped' | 'rest' | undefined,
): string {
  const hue = phaseColour(phase)
  switch (status) {
    case 'full': return hue
    case 'minimum': return `color-mix(in srgb, ${hue} 46%, white)`
    case 'skipped': return 'var(--color-marker)'
    case 'rest': return `color-mix(in srgb, ${hue} 6%, white)`
    default: return `color-mix(in srgb, ${hue} 13%, white)`
  }
}

/** Benchmarks are marked by shape, not colour — a round specimen among square
 *  ones, which survives whatever hue its phase happens to be. */
export function cellShape(isBenchmark: boolean): string {
  return isBenchmark ? 'rounded-full' : 'rounded-[3px]'
}
