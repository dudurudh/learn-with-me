/**
 * The mark is the drawer itself: a small grid of compartments with one filled.
 * It matches the home screen icon, so the thing on your phone and the thing at
 * the top of the page are recognisably the same object.
 */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-[11px] rounded-[10px] border border-[rgba(36,69,127,.16)] bg-white/70 px-[13px] py-[8px]">
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
      <span className="font-display text-[21px] font-semibold leading-none tracking-[-0.022em] text-graphite">
        Learn with me
      </span>
    </span>
  )
}
