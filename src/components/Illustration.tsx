/**
 * Small hairline drawings for empty states. They are deliberately quiet: a
 * line weight of 1 at low opacity, no fills, no character. The job is to make
 * an empty screen look intended rather than broken.
 */
const stroke = { fill: 'none', strokeWidth: 1, strokeLinecap: 'round' } as const

export function EmptyDrawer({ tint = 'var(--color-accent)' }: { tint?: string }) {
  return (
    <svg viewBox="0 0 200 120" className="h-[104px] w-[172px]" style={{ color: tint, opacity: 0.32 }} aria-hidden>
      <g stroke="currentColor" {...stroke}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) => (
            <rect key={`${row}-${col}`} x={12 + col * 30} y={14 + row * 32} width={22} height={22} rx={3} />
          )),
        )}
      </g>
      <rect x={102} y={46} width={22} height={22} rx={3} fill="currentColor" opacity={0.5} />
    </svg>
  )
}

export function EmptyFrames({ tint = 'var(--color-accent)' }: { tint?: string }) {
  return (
    <svg viewBox="0 0 220 110" className="h-[96px] w-[192px]" style={{ color: tint, opacity: 0.32 }} aria-hidden>
      <g stroke="currentColor" {...stroke}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={8 + i * 42} y={10} width={30} height={70} rx={3} strokeDasharray={i > 1 ? '3 4' : undefined} />
            <line x1={8 + i * 42} y1={88} x2={38 + i * 42} y2={88} strokeWidth={2} />
          </g>
        ))}
        <path d="M20 62 q7 -26 15 0" />
        <ellipse cx={77} cy={48} rx={11} ry={5} />
        <ellipse cx={77} cy={60} rx={11} ry={5} />
      </g>
    </svg>
  )
}

export function EmptyPage({ tint = 'var(--color-accent)' }: { tint?: string }) {
  return (
    <svg viewBox="0 0 160 120" className="h-[104px] w-[138px]" style={{ color: tint, opacity: 0.32 }} aria-hidden>
      <g stroke="currentColor" {...stroke}>
        <rect x={22} y={8} width={116} height={104} rx={4} />
        <line x1={44} y1={8} x2={44} y2={112} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={56} y1={28 + i * 14} x2={i % 3 === 2 ? 100 : 126} y2={28 + i * 14} />
        ))}
      </g>
    </svg>
  )
}

export function EmptyWall({ tint = 'var(--color-accent)' }: { tint?: string }) {
  return (
    <svg viewBox="0 0 200 120" className="h-[104px] w-[172px]" style={{ color: tint, opacity: 0.32 }} aria-hidden>
      <g stroke="currentColor" {...stroke}>
        {[0, 1].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <g key={`${row}-${col}`}>
              <rect x={10 + col * 46} y={10 + row * 54} width={38} height={44} rx={4} strokeDasharray="3 4" />
            </g>
          )),
        )}
        <path d="M18 44 l10 -14 l8 10 l6 -6" strokeDasharray="none" />
      </g>
    </svg>
  )
}
