/**
 * GitHub Pages cannot push you a notification. A static site can only fire one
 * while a tab is open, and scheduled local notifications are not broadly
 * supported. So there are three mechanisms here and only two of them work when
 * the app is closed. This file is honest about which is which.
 */

export type ReminderMechanism = 'in-app' | 'calendar' | 'ntfy'

export const MECHANISMS: {
  id: ReminderMechanism; name: string; whenClosed: boolean; summary: string
}[] = [
  {
    id: 'in-app', name: 'Browser notification', whenClosed: false,
    summary: 'Fires at your chosen time only while this app is open in a tab. Cheap, works, limited.',
  },
  {
    id: 'calendar', name: 'Calendar subscription', whenClosed: true,
    summary: 'A real system alarm every day, from your phone\u2019s own calendar. Subscribe once. This is the one that actually works.',
  },
  {
    id: 'ntfy', name: 'ntfy push', whenClosed: true,
    summary: 'A scheduled GitHub Action posts to your ntfy topic and the free app pushes it. No account, no key.',
  },
]

function pad(n: number): string { return String(n).padStart(2, '0') }

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
    + `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}

/** Folded to 75 octets per RFC 5545; Apple Calendar is strict about it. */
function fold(line: string): string {
  if (line.length <= 74) return line
  const parts = [line.slice(0, 74)]
  let rest = line.slice(74)
  while (rest.length > 73) { parts.push(' ' + rest.slice(0, 73)); rest = rest.slice(73) }
  if (rest) parts.push(' ' + rest)
  return parts.join('\r\n')
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export interface IcsOptions {
  time: string          // "19:30"
  appUrl: string
  durationMinutes?: number
}

export function buildIcs({ time, appUrl, durationMinutes = 30 }: IcsOptions): string {
  const [hour, minute] = time.split(':').map(Number)
  const start = new Date()
  start.setHours(hour, minute, 0, 0)
  if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1)
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//learn-with-me//365//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:learn-with-me-daily-${stamp(start)}@github.io`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText('Today\u2019s task')}`,
    `DESCRIPTION:${escapeText(`Open the app and see what today is.\n${appUrl}`)}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${escapeText('Today\u2019s task')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(options: IcsOptions): void {
  const blob = new Blob([buildIcs(options)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'learn-with-me-daily.ics'
  a.click()
  URL.revokeObjectURL(url)
}

// ── in-app notification ───────────────────────────────────────────────

export function notificationState(): 'unsupported' | NotificationPermission {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function askForNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/**
 * Only fires while a tab is open — that is the whole limitation. Returns a
 * cancel function; the caller is responsible for clearing it.
 */
export function scheduleInApp(time: string, onFire: () => void): () => void {
  const [hour, minute] = time.split(':').map(Number)
  let timer: ReturnType<typeof setTimeout>

  const arm = () => {
    const next = new Date()
    next.setHours(hour, minute, 0, 0)
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
    timer = setTimeout(() => { onFire(); arm() }, next.getTime() - Date.now())
  }
  arm()
  return () => clearTimeout(timer)
}
