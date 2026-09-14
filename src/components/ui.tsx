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
  children, onClick, primary, disabled, title,
}: {
  children: ReactNode; onClick?: () => void; primary?: boolean
  disabled?: boolean; title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'font-display rounded-[7px] px-[18px] py-[11px] text-[14px] font-medium ' +
        'transition-[background-color,transform] duration-100 active:translate-y-[1px] ' +
        'disabled:cursor-not-allowed disabled:text-[var(--ink-3)] ' +
        (primary
          ? 'bg-foam-deep text-paper hover:bg-[#27596a] disabled:bg-marker disabled:text-[var(--ink-3)]'
          : 'border border-[var(--rule-strong)] bg-paper hover:bg-[color-mix(in_srgb,var(--color-foam)_14%,var(--color-paper))]')
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

