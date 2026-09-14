import type { ReactNode } from 'react'

export function Rule() {
  return <hr className="my-0 border-0 border-t border-[var(--rule)]" />
}

export function Section({ title, children }: { n?: string; title: string; children: ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="font-display mb-5 text-[19px] font-semibold tracking-[-0.012em]">{title}</h2>
      {children}
    </section>
  )
}

export function Button({
  children, onClick, primary, disabled, title, accent,
}: {
  children: ReactNode; onClick?: () => void; primary?: boolean
  disabled?: boolean; title?: string; accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={primary && accent && !disabled ? { background: accent } : undefined}
      className={
        'font-display inline-flex items-center gap-[7px] rounded-[9px] px-[16px] py-[10px] text-[14px] font-medium ' +
        'transition-[background-color,transform] duration-100 active:translate-y-[1px] ' +
        'disabled:cursor-not-allowed disabled:text-[var(--ink-3)] ' +
        (primary
          ? 'bg-action text-page hover:bg-[#10495c] disabled:bg-marker disabled:text-[var(--ink-3)]'
          : 'border border-[var(--rule-strong)] bg-page hover:bg-[color-mix(in_srgb,var(--phase)_14%,var(--color-page))]')
      }
    >
      {children}
    </button>
  )
}

/** Controls sit flush against each other, separated by the rule colour
 *  showing through as grout. No shadows, no gaps, no rounded corners. */
export function ButtonRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-max max-w-full flex-wrap gap-[6px]">{children}</div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[60ch] text-[13.5px] text-[var(--ink-2)]">{children}</p>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="font-display mb-[6px] block text-[14px] font-medium">{label}</span>
      {children}
    </label>
  )
}


/** A soft tinted box. Used for anything that is set apart from the running
 *  text — which is clearer than floating italics and warmer than a rule. */
export function Callout({
  title, tint = 'var(--color-p1)', strength = 6, children,
}: {
  title?: ReactNode
  tint?: string
  strength?: number
  children: ReactNode
}) {
  return (
    <div
      className="rounded-[12px] px-5 py-4"
      style={{ background: `color-mix(in srgb, ${tint} ${strength}%, white)` }}
    >
      {title && (
        <div className="font-display mb-2 text-[13.5px] font-semibold" style={{ color: tint }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
