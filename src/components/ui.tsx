import type { ReactNode } from 'react'

export function Rule() {
  return <hr className="my-0 border-0 border-t border-[var(--rule)]" />
}

export function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="relative mb-14 sm:pl-[104px]">
      <span className="font-display tnum absolute left-0 hidden w-[72px] pt-[3px] text-right text-[12px] text-[var(--ink-3)] sm:block">
        {n}
      </span>
      <span className="font-display absolute left-[80px] top-0 hidden h-full w-px bg-[var(--rule)] sm:block" />
      <h2 className="font-display mb-5 border-b border-[var(--rule-strong)] pb-[7px] text-[15px] font-semibold tracking-[-0.006em]">
        {title}
      </h2>
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
        'font-display px-[17px] py-[11px] text-[13.5px] font-medium ' +
        'transition-[background-color,transform] duration-100 active:translate-y-[1px] ' +
        'disabled:cursor-not-allowed disabled:text-[var(--ink-3)] ' +
        (primary
          ? 'bg-foam-deep text-paper hover:bg-[#27596a] disabled:bg-marker disabled:text-[var(--ink-3)]'
          : 'bg-paper hover:bg-[color-mix(in_srgb,var(--color-foam)_16%,var(--color-paper))]')
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
    <div className="flex w-max max-w-full flex-wrap gap-px border border-[var(--rule-strong)] bg-[var(--rule-strong)]">
      {children}
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[60ch] text-[13.5px] text-[var(--ink-2)]">{children}</p>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 grid grid-cols-[150px_1fr] items-baseline gap-4">
      <span className="font-display text-[12px] text-[var(--ink-3)]">{label}</span>
      {children}
    </label>
  )
}
