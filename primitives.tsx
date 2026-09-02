import type React from "react"
import { cn } from "@/lib/utils"

export function Panel({
  step,
  title,
  desc,
  children,
  id,
  className,
}: {
  step?: string
  title: string
  desc?: React.ReactNode
  children: React.ReactNode
  id?: string
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-sm border border-panel-line bg-panel px-5 py-5 sm:px-6",
        className,
      )}
    >
      <header className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground text-balance">
          {step && (
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brass font-mono text-xs font-bold text-primary-foreground">
              {step}
            </span>
          )}
          {title}
        </h2>
        {desc && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{desc}</p>}
      </header>
      {children}
    </section>
  )
}

export function Field({
  label,
  htmlFor,
  children,
  warn,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  warn?: string | null
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {warn && <p className="mt-1 font-mono text-[0.68rem] text-destructive">{warn}</p>}
    </div>
  )
}

export function Readout({
  label,
  value,
  unit,
  tone = "phosphor",
  className,
}: {
  label: string
  value: string
  unit?: string
  tone?: "phosphor" | "brass" | "muted"
  className?: string
}) {
  const toneClass =
    tone === "brass" ? "text-brass" : tone === "muted" ? "text-muted-foreground" : "text-phosphor phosphor-glow"
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-2 rounded-sm border border-phosphor-dim bg-readout px-4 py-3.5",
        className,
      )}
    >
      <span className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono">
        <span className={cn("text-2xl font-semibold", toneClass)}>{value}</span>
        {unit && <span className="ml-1.5 text-sm text-phosphor-dim">{unit}</span>}
      </span>
    </div>
  )
}

export const inputClass =
  "w-full rounded-sm border border-panel-line bg-input px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-brass"

export const selectClass = inputClass + " appearance-none cursor-pointer"

export const buttonClass =
  "cursor-pointer rounded-sm border border-brass-dim bg-gradient-to-b from-secondary to-panel px-3.5 py-2.5 font-mono text-sm text-phosphor transition-colors hover:border-brass active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
