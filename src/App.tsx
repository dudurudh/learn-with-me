const TOKENS = [
  { name: 'graphite', hex: '#22201D' },
  { name: 'paper', hex: '#F5F2EC' },
  { name: 'marker-grey', hex: '#D8D3C8' },
  { name: 'foam', hex: '#62A8B8' },
  { name: 'foam-deep', hex: '#2E6B7C' },
  { name: 'cinnabar', hex: '#C25A28' },
]

export default function App() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-14">
      <div className="font-display text-[11px] tracking-[0.02em] text-[var(--ink-3)]">
        DEPLOY CHECK &middot; {import.meta.env.BASE_URL}
      </div>

      <h1 className="font-display mt-3 text-[26px] font-semibold tracking-[-0.015em]">
        Nothing collected yet
      </h1>

      <p className="mt-2 max-w-[52ch] text-[var(--ink-2)]">
        The scaffold is live and the base path resolves. Fonts, tokens and the
        stylesheet all loaded from this origin, which means the curriculum can
        follow.
      </p>

      <div className="mt-10 flex w-max border border-[var(--rule-strong)] bg-[var(--rule-strong)] gap-px">
        {TOKENS.map((t) => (
          <div key={t.name} className="bg-paper">
            <div className="h-16 w-16" style={{ background: t.hex }} />
            <div className="px-2 py-2 text-[10px] leading-tight">
              <div className="font-display font-semibold">{t.name}</div>
              <div className="tnum font-display text-[var(--ink-3)]">{t.hex}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 border-t border-[var(--rule-strong)] pt-5">
        <div className="font-display tnum text-[64px] leading-[0.92] font-bold tracking-[-0.03em]">
          000
        </div>
        <div className="font-display mt-2 text-[15px] text-[var(--ink-3)]">
          days recorded &middot; 365 remaining
        </div>
      </div>
    </main>
  )
}
