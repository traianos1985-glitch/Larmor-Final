"use client"

import { cn } from "@/lib/utils"

export interface SpectrumBar {
  n: number
  /** Σχετικό πλάτος ως προς τη θεμελιώδη (0–1). */
  amp: number
}

/** Signature element: οθόνη σαρωτή φάσματος με κατακόρυφες γραμμές αρμονικών.
 *  Το ύψος κάθε γραμμής αντανακλά το σχετικό πλάτος της αρμονικής (π.χ. 1/n για
 *  το τετράγωνο), ώστε το φάσμα να είναι φυσικά ρεαλιστικό. */
export function Spectrum({
  bars,
  active,
  onSelect,
}: {
  bars: SpectrumBar[]
  active: number
  onSelect: (n: number) => void
}) {
  const count = bars.length
  if (count === 0) {
    return (
      <div className="mt-4 flex h-24 items-center justify-center rounded-sm border border-panel-line bg-readout font-mono text-[0.7rem] text-muted-foreground">
        Καμία αρμονική εντός ορίου εκπομπής
      </div>
    )
  }
  return (
    <div className="relative mt-4 h-24 overflow-hidden rounded-sm border border-panel-line bg-readout">
      <div className="absolute inset-x-0 bottom-6 h-px bg-panel-line" />
      {bars.map((bar, i) => {
        // Ελάχιστο ορατό ύψος 12% ώστε ακόμα και μικρές αρμονικές να πατιούνται.
        const heightPct = 12 + Math.max(0, Math.min(1, bar.amp)) * 73
        const xPct = ((i + 1) / (count + 1)) * 100
        const isActive = bar.n === active
        return (
          <button
            key={bar.n}
            type="button"
            onClick={() => onSelect(bar.n)}
            className="absolute bottom-0 top-0 -translate-x-1/2 cursor-pointer bg-transparent px-1"
            style={{ left: `${xPct}%` }}
            aria-label={`Επιλογή αρμονικής n=${bar.n}`}
          >
            <span
              className={cn(
                "absolute bottom-6 left-1/2 w-0.5 -translate-x-1/2",
                isActive ? "bg-phosphor tick-glow" : "bg-phosphor-dim",
              )}
              style={{ height: `${heightPct}%` }}
            />
            <span
              className={cn(
                "absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[0.6rem]",
                isActive ? "text-phosphor" : "text-muted-foreground",
              )}
            >
              n{bar.n}
            </span>
          </button>
        )
      })}
    </div>
  )
}
