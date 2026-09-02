"use client"

import { useState } from "react"
import { Calculator } from "@/components/larmor/calculator"

const TABS = [
  { id: "calc" as const, label: "Υπολογισμός", hint: "Larmor · αρμονικές · διάθλαση" },
  { id: "mapping" as const, label: "Χαρτογράφηση & Τριγωνισμός", hint: "§7 · §8 · §9 · §10" },
]

export default function Page() {
  const [tab, setTab] = useState<"calc" | "mapping">("calc")

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 md:px-6 md:py-10">
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
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Υπολογισμός συχνότητας Larmor{" "}
          <span className="font-mono text-foreground">f = γ · B</span> για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο,
          αρμονικές, βάθος διείσδυσης και μοντέλο διάθλασης.
        </p>

        {/* Καρτέλες πλοήγησης — εναλλαγή μεταξύ κύριου υπολογισμού και χαρτογράφησης/τριγωνισμού */}
        <nav aria-label="Ενότητες εφαρμογής" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(t.id)}
                className={
                  "flex flex-col items-start rounded-sm border px-3.5 py-2 text-left transition-colors " +
                  (active
                    ? "border-brass bg-secondary/50 text-phosphor"
                    : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
                }
              >
                <span className="font-mono text-[0.78rem] font-semibold uppercase tracking-wide">
                  {active ? "▸ " : ""}
                  {t.label}
                </span>
                <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                  {t.hint}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      <Calculator tab={tab} />

      <footer className="mt-2 flex flex-col gap-2 border-t border-panel-line pt-5 text-xs leading-relaxed text-muted-foreground">
        <p className="text-pretty">
          <span className="font-semibold text-brass">Επιστημονική σημείωση:</span> Οι συχνότητες Larmor και οι
          υπολογισμοί ηλεκτρομαγνητισμού βασίζονται σε καθιερωμένη φυσική. Η χρήση τους ως{" "}
          <em>μέθοδος ανίχνευσης μετάλλων εξ αποστάσεως είναι πειραματική</em> και δεν έχει επιβεβαιωθεί από
          ανεξάρτητη έρευνα. Τα αποτελέσματα προορίζονται για εκπαιδευτική και διερευνητική χρήση.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider">
          Γεωμαγνητικό μοντέλο: NOAA WMM (με offline dipole fallback) · Ακρίβεια IEEE-754 double precision
        </p>
      </footer>
    </main>
  )
}
