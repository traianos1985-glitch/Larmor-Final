"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/", label: "Υπολογιστής", sub: "Ενότητες 1–6" },
  { href: "/mapping", label: "Χαρτογράφηση", sub: "Ενότητες 7–8" },
]

function normalize(path: string): string {
  // trailingSlash: true → paths like "/mapping/". Strip trailing slash (κρατώντας το "/").
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1)
  return path
}

export function AppHeader() {
  const pathname = normalize(usePathname() || "/")

  return (
    <header className="flex flex-col gap-4 border-b border-panel-line pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Στυλιζαρισμένο σήμα "οργάνου": δίπολο B με precession */}
          <span
            aria-hidden="true"
            className="tick-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-brass-dim bg-readout"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-phosphor">
              <path d="M12 2v20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <ellipse cx="12" cy="12" rx="9" ry="4" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <circle cx="12" cy="12" r="2.4" fill="currentColor" />
              <path d="M12 4l2.4 2.4M12 4l-2.4 2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight text-foreground text-balance md:text-2xl">
              Larmor <span className="text-brass">&amp;</span> Αρμονικές
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
              Υπολογιστής Συχνοτήτων Μετάλλων
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="tick-glow inline-block h-1.5 w-1.5 rounded-full bg-phosphor" />
            rev. 2 · next.js
          </span>
          <span>WMM · geomag</span>
        </div>
      </div>

      <nav aria-label="Ενότητες εφαρμογής" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex flex-col rounded-sm border px-3.5 py-2 transition-colors " +
                (active
                  ? "border-brass bg-secondary/50 text-brass"
                  : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
              }
            >
              <span className="font-display text-sm font-semibold leading-tight">{tab.label}</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-wider opacity-80">{tab.sub}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
