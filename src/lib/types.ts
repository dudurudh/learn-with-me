// ── Curriculum (read-only, fetched from public/curriculum.json) ─────────

export type ActivityType =
  | 'sketch' | 'watch' | 'read' | 'cad' | 'make' | 'review' | 'rest'

export type ResourceMode = 'assigned' | 'reference' | 'queue'

export interface CurriculumResource {
  title: string
  publisher: string | null
  type: 'book' | 'video' | 'course' | 'web'
  cost: 'free' | 'paid'
  multiSession: boolean
  note?: string
}

export interface CurriculumDay {
  dayId: string
  day: number
  phase: number
  week: number
  type: ActivityType
  title: string
  full: string
  minimum: string
  question: string | null
  minutes: number
  resource: { id: string; section: string | null } | null
  resourceMode: ResourceMode | null
  isProjectBlock: boolean
  isRest: boolean
  isBenchmark: boolean
  isDeload: boolean
}

export interface Phase {
  phase: number
  title: string
  dayStart: number
  dayEnd: number
  goal: string
}

export interface Curriculum {
  schemaVersion: number
  warmUp: string
  resources: Record<string, CurriculumResource>
  phases: Phase[]
  days: CurriculumDay[]
  deloadWeeks: { from: number; to: number }[]
}

// ── Progress (owned by the user, lives only in IndexedDB) ──────────────

/** `rest` is not a failure state — it records that an optional day went by. */
export type DayStatus = 'full' | 'minimum' | 'skipped' | 'rest'

export type TimeBucket = 'under10' | '10to20' | '20to40' | '40plus'

export interface ProgressRecord {
  /** The stable key. Never the day number, never an array index. */
  dayId: string
  /** Snapshot of the day number when it was completed, so reordering the
   *  curriculum later does not rewrite history. */
  day: number
  type: ActivityType
  status: DayStatus
  /** Real clock time of the action. */
  completedAt: string
  /** Calendar date the action counts towards, after the day-boundary hour. */
  planDate: string
  actualTime: TimeBucket | null
  note: string
  photoIds: string[]
  /** Set when this day arrived early because another was deferred. */
  swappedFor: string | null
  seed?: true
}

export type Holding = 'none' | 'owned' | 'borrowed'
export type ResourceProgress = 'unstarted' | 'active' | 'done' | 'notInterested'

export interface ResourceState {
  id: string
  holding: Holding
  progress: ResourceProgress
  /** Only meaningful when holding is 'borrowed'. */
  dueBack: string | null
  seed?: true
}

export interface Deadline {
  id: string
  school: string
  programme: string
  date: string
  priority: 'high' | 'medium' | 'low'
}

export interface Settings {
  /** 04:00 by default: an 00:20 session belongs to the day before. */
  dayBoundaryHour: number
  graceBudget: number
  graceWindowDays: number
  swapsPerWeek: number
  reminderTime: string
  newsGatedUntilComplete: boolean
  deviceId: string
  deviceName: string
  lastExportAt: string | null
  completedSinceExport: number
  seeded: boolean
  ntfyTopic: string
  gistToken: string
  gistId: string
  githubToken: string
  githubRepo: string
  deadlines: Deadline[]
}

export interface PhotoRecord {
  id: string
  dayId: string
  createdAt: string
  blob: Blob
  width: number
  height: number
  bytes: number
  remotePath: string | null
  uploadState: 'local' | 'queued' | 'uploaded' | 'failed'
  seed?: true
}
