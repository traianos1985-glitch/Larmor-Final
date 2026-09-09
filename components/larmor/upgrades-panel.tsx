"use client"

import { useMemo, useState } from "react"
import { Panel, Field, Readout, inputClass } from "./primitives"
import {
  frequencyConsensus,
  fmtHz,
  fmtMeters,
  type BandCandidate,
  type SweepParams,
} from "@/lib/upgrades"

export interface UpgradesPanelProps {
  f0: number
  fSelected: number
  selectedBandLabel: string | null
  bands: BandCandidate[]
  params: SweepParams
}

/**
 * Νέα καρτέλα «Αναβαθμίσεις ακρίβειας». Read-only ανάλυση πάνω στις ΙΔΙΕΣ
 * ομαδοποιημένες αρμονικές — δεν αλλάζει καμία αρχική τιμή/υπολογισμό.
 */
export function UpgradesPanel({ f0, fSelected, selectedBandLabel, bands, params }: UpgradesPanelProps) {
  // Ανοχή θέσης για το παράθυρο sweep (cm) — πόσο επιτρέπουμε να «κουνηθεί»
  // η εκτίμηση θέσης καθώς σαρώνουμε τη συχνότητα πάνω-κάτω.
  const [tolCm, setTolCm] = useState(5)
  const tolM = Math.max(0.001, tolCm / 100)

  const consensus = useMemo(
    () => frequencyConsensus(bands, params, f0, tolM),
    [bands, params, f0, tolM],
  )

  if (!bands.length) {
    return (
      <Panel step="A" title="Αναβαθμίσεις ακρίβειας" desc="Δεν υπάρχουν διαθέσιμες ζώνες αρμονικών για ανάλυση.">
        <p className="font-mono text-sm text-muted-foreground">
          Όρισε υλικό, πεδίο B και έδαφος στην καρτέλα «Υπολογισμός» για να εμφανιστούν οι προτεινόμενες ζώνες.
        </p>
      </Panel>
    )
  }

  const rec = consensus.rows.find((r) => r.isRecommended) ?? null

  return (
    <div className="flex flex-col gap-5">
      <Panel
        step="A"
        title="Αναβαθμίσεις ακρίβειας — επιλογή με «ελάχιστη μετατόπιση θέσης»"
        desc="Νέα, μη-επεμβατική ανάλυση πάνω στις ίδιες ομαδοποιημένες αρμονικές. Κριτήριο: όχι η μέγιστη ισχύς, αλλά η ελάχιστη ευαισθησία της θέσης στη συχνότητα (∂x_total/∂f) + εύρωστη πολυσυχνοτική σύνθεση. Όλες οι συχνότητες σε Hz."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Readout
            label="Προτεινόμενη ζώνη (πιο σταθερή θέση)"
            value={rec ? rec.label : "—"}
            tone="phosphor"
          />
          <Readout
            label="Συχνότητα προτεινόμενης ζώνης"
            value={rec ? fmtHz(rec.f) : "—"}
            tone="brass"
          />
          <Readout
            label="Σταθμισμένο διάμεσο x_total"
            value={fmtMeters(consensus.weightedMedianM)}
            tone="phosphor"
          />
        </div>
        <p className="mt-3 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
          Επιλεγμένη συχνότητα εφαρμογής: <span className="text-foreground">{fmtHz(fSelected)}</span>
          {selectedBandLabel ? ` (ζώνη «${selectedBandLabel}»)` : ""}. Η προτεινόμενη ζώνη είναι εκείνη με το
          μεγαλύτερο δείκτη σταθερότητας 1/(1 + |∂x/∂f|) — εκεί η αβεβαιότητα της f δεν περνά σε σφάλμα θέσης.
        </p>
      </Panel>

      {/* Αναβάθμιση #1 + sweeping: ομαδοποιημένες αρμονικές με ∂x/∂f και Hz πάνω-κάτω */}
      <Panel
        step="B"
        title="Ομαδοποιημένες αρμονικές & sweeping (Hz πάνω-κάτω)"
        desc="Για κάθε προτεινόμενη αρμονική: πόσο μετακινείται η θέση ανά 1% μεταβολή της συχνότητας, ο δείκτης σταθερότητας, και το εύρος sweep (κεντρική συχνότητα ± Hz) μέσα στο οποίο η εκτίμηση θέσης μένει εντός της ανοχής."
      >
        <div className="mb-4 max-w-xs">
          <Field label={`Ανοχή θέσης για sweep (cm) — τώρα ±${tolCm} cm`} htmlFor="sweep-tol">
            <input
              id="sweep-tol"
              type="range"
              min={1}
              max={30}
              step={1}
              value={tolCm}
              onChange={(e) => setTolCm(Number.parseInt(e.target.value, 10) || 5)}
              className="w-full accent-[var(--brass,#c9a23f)]"
            />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-sm border border-panel-line bg-readout">
          <table className="w-full min-w-[720px] font-mono text-[0.72rem]">
            <thead>
              <tr className="border-b border-panel-line text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Ζώνη</th>
                <th className="px-3 py-2 font-medium">n</th>
                <th className="px-3 py-2 font-medium">Κεντρική f (Hz)</th>
                <th className="px-3 py-2 font-medium">Sweep − (Hz)</th>
                <th className="px-3 py-2 font-medium">Sweep + (Hz)</th>
                <th className="px-3 py-2 font-medium">± Hz</th>
                <th className="px-3 py-2 font-medium">x_total</th>
                <th className="px-3 py-2 font-medium">∂x / 1%f</th>
                <th className="px-3 py-2 font-medium">Σταθερότητα</th>
              </tr>
            </thead>
            <tbody>
              {consensus.rows.map((r) => (
                <tr
                  key={r.label}
                  className={
                    "border-b border-panel-line/60 " +
                    (r.isRecommended ? "bg-secondary/40 text-phosphor" : "text-foreground")
                  }
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.isRecommended ? "★ " : ""}
                    {r.label}
                  </td>
                  <td className="px-3 py-2">{r.n}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtHz(r.f)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtHz(r.window.fLo)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtHz(r.window.fHi)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-brass">
                    ±{fmtHz(r.window.deltaHz)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtMeters(r.xTotal)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtMeters(r.dxdfPerPercent)}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-14 overflow-hidden rounded-full border border-panel-line bg-panel align-middle">
                        <span
                          className={"block h-full " + (r.isRecommended ? "bg-phosphor" : "bg-brass")}
                          style={{ width: `${Math.round(r.stability * 100)}%` }}
                        />
                      </span>
                      {(r.stability * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
          Το «± Hz» δείχνει πόσο πάνω-κάτω από την κεντρική συχνότητα μπορείς να σαρώσεις (sweep) ώστε η εκτίμηση
          θέσης να μη μετακινηθεί πάνω από ±{tolCm} cm. Το εύρος φράσσεται στη μισή απόσταση αρμονικών (f₀/2 ={" "}
          {fmtHz(f0 / 2)}) ώστε το sweep να μην πατά τη γειτονική αρμονική.
        </p>
      </Panel>

      {/* Αναβάθμιση #2 + #3: εύρωστη σύνθεση + guard μη-μονοτονικότητας */}
      <Panel
        step="C"
        title="Εύρωστη πολυσυχνοτική σύνθεση & guard μη-μονοτονικότητας"
        desc="Αντί για single-pick, σταθμισμένο διάμεσο του x_total σε όλες τις ζώνες (βάρη rEff × καθαρότητα ορυκτοποίησης × σταθερότητα). Ο διάμεσος «κόβει» τα artifacts. Αν η ακολουθία x_total(f) δεν είναι μονοτονική, σηκώνεται flag → προτείνεται τριγωνισμός."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Readout label="Σταθμισμένο διάμεσο x_total" value={fmtMeters(consensus.weightedMedianM)} tone="phosphor" />
          <Readout label="Απλό διάμεσο x_total" value={fmtMeters(consensus.simpleMedianM)} tone="brass" />
          <Readout
            label="Σταθερή περιοχή x_total"
            value={
              consensus.stableRange
                ? `${fmtMeters(consensus.stableRange[0])} … ${fmtMeters(consensus.stableRange[1])}`
                : "—"
            }
            tone="muted"
          />
          <Readout
            label="Frequency-spread (εμπιστοσύνη)"
            value={`${(consensus.spreadFactor * 100).toFixed(0)}`}
            unit="/100"
            tone={consensus.spreadFactor >= 0.66 ? "phosphor" : "brass"}
          />
        </div>

        <div
          className={
            "mt-4 flex items-start gap-3 rounded-sm border px-4 py-3 " +
            (consensus.monotonic
              ? "border-phosphor-dim bg-readout"
              : "border-destructive bg-destructive/10")
          }
        >
          <span
            aria-hidden="true"
            className={
              "mt-0.5 inline-block size-2.5 shrink-0 rounded-full " +
              (consensus.monotonic ? "bg-phosphor" : "bg-destructive")
            }
          />
          <div className="font-mono text-[0.72rem] leading-relaxed">
            {consensus.monotonic ? (
              <>
                <span className="text-phosphor">Μονοτονική x_total(f)</span> — η θέση κινείται ομαλά με τη
                συχνότητα ({consensus.monotonicDir === "up" ? "αύξουσα" : consensus.monotonicDir === "down" ? "φθίνουσα" : "σταθερή"}).
                Το σταθμισμένο διάμεσο είναι αξιόπιστο.
              </>
            ) : (
              <>
                <span className="text-destructive">Μη-μονοτονική x_total(f) — flag!</span> Καθεστώς κοντινού
                πεδίου (πρβλ. §20): η θέση δεν αλλάζει μονότονα με τη συχνότητα. Ρίξε το βάρος της απόστασης και
                προώθησε τη διόπτευση στον <span className="text-foreground">τριγωνισμό</span> (καρτέλα
                «Χαρτογράφηση &amp; Τριγωνισμός»). Εύρος διασποράς: {fmtMeters(consensus.spreadM)}.
              </>
            )}
          </div>
        </div>

        <p className="mt-3 border-t border-panel-line pt-3 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
          Ο «Frequency-spread» δείκτης = 1/(1 + διασπορά/διάμεσο): σφιχτή συστάδα τιμών x_total → υψηλή
          εμπιστοσύνη, μεγάλη διασπορά (artifacts όπως τα 5,5 m / 3,1 m του §20) → χαμηλή. Είναι πραγματικός
          δείκτης εμπιστοσύνης, συμπληρωματικός στους δείκτες ποιότητας της χαρτογράφησης — χωρίς να αλλάζει
          κανέναν αρχικό υπολογισμό.
        </p>
      </Panel>
    </div>
  )
}
