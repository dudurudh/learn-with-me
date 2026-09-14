import {
  PenLine, Play, BookOpen, Box, Hammer, RefreshCw, Moon,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityType } from './types'

/**
 * Each kind of day gets a colour and a mark of its own. The phase colours
 * carry the long arc of the year; this carries what today actually is, so a
 * screen is never one hue all the way down.
 */
export const ACTIVITY: Record<ActivityType, {
  icon: LucideIcon; label: string; colour: string
}> = {
  sketch: { icon: PenLine,  label: 'drawing',        colour: 'var(--color-p1)' },
  watch:  { icon: Play,     label: 'watching',       colour: 'var(--color-p6)' },
  read:   { icon: BookOpen, label: 'reading',        colour: 'var(--color-p4)' },
  cad:    { icon: Box,      label: 'modelling',      colour: 'var(--color-p3)' },
  make:   { icon: Hammer,   label: 'making',         colour: 'var(--color-p2)' },
  review: { icon: RefreshCw,label: 'looking back',   colour: 'var(--color-p5)' },
  rest:   { icon: Moon,     label: 'rest',           colour: 'var(--color-marker)' },
}

export function activityOf(type: ActivityType) {
  return ACTIVITY[type] ?? ACTIVITY.sketch
}
