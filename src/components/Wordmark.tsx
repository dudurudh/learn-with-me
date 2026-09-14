/**
 * The mark is the drawer itself: a small grid of compartments with one filled.
 * It matches the home screen icon, so the thing on your phone and the thing at
 * the top of the page are recognisably the same object.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-[10px]">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden
        className="shrink-0"
      >
        <rect x="0.5" y="0.5" width="23" height="23" rx="5" fill="var(--color-accent)" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={4.5 + c * 5.5}
              y={4.5 + r * 5.5}
              width="4"
              height="4"
              rx="1"
              fill="white"
              opacity={r === 1 && c === 1 ? 1 : 0.42}
            />
          )),
        )}
      </svg>
      <span className="font-display text-[16px] font-semibold tracking-[-0.012em] text-graphite">
        Learn with me
      </span>
    </span>
  )
}
