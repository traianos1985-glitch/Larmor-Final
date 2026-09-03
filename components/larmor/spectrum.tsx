"use client"

import { cn } from "@/lib/utils"

/** Signature element: οθόνη σαρωτή φάσματος με κατακόρυφες γραμμές αρμονικών.
 * Όταν δίνεται `amplitudes`, το ύψος κάθε γραμμής αντανακλά το σχετικό πλάτος της
 * αρμονικής (θεμελιώδης = 1) και οι απούσες αρμονικές εμφανίζονται ως αμυδρά στελέχη. */
export function Spectrum({
  count,
  active,
  onSelect,
  amplitudes,
}: {
  count: number
  active: number
  onSelect: (n: number) => void
  amplitudes?: number[]
}) {
  return (
    <div className="relative mt-4 h-24 overflow-hidden rounded-sm border border-panel-line bg-readout">
      <div className="absolute inset-x-0 bottom-6 h-px bg-panel-line" />
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const amp = amplitudes ? (amplitudes[n - 1] ?? 0) : undefined
        const present = amp === undefined ? true : amp > 0
        // Με πλάτη: κλιμάκωση ύψους στο πλάτος (min 25%). Χωρίς: παλιά γραμμική άνοδος.
        const heightPct =
          amp === undefined
            ? 30 + (n / count) * 55
            : present
              ? 25 + amp * 60
              : 6
        const xPct = (n / (count + 1)) * 100
        const isActive = n === active && present
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className="absolute bottom-0 top-0 -translate-x-1/2 cursor-pointer bg-transparent px-1"
            style={{ left: `${xPct}%` }}
            aria-label={`Επιλογή αρμονικής n=${n}${present ? "" : " (δεν εκπέμπεται)"}`}
          >
            <span
              className={cn(
                "absolute bottom-6 left-1/2 w-0.5 -translate-x-1/2",
                !present
                  ? "bg-panel-line opacity-50"
                  : isActive
                    ? "bg-phosphor tick-glow"
                    : "bg-phosphor-dim",
              )}
              style={{ height: `${heightPct}%` }}
            />
            <span
              className={cn(
                "absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[0.6rem]",
                !present ? "text-muted-foreground/40" : isActive ? "text-phosphor" : "text-muted-foreground",
              )}
            >
              n{n}
            </span>
          </button>
        )
      })}
    </div>
  )
}
