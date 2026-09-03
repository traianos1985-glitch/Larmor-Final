"use client"

import { Panel, Readout } from "./primitives"
import { fmtHzOnly } from "@/lib/physics"

/** Μία γραμμή ανάλυσης halo ανά επιλέξιμη ζώνη/συχνότητα εκπομπής. */
export interface HaloRow {
  label: string
  n: number
  f: number
  rFresnelM: number
  signalRel: number
  rEff: number
  eligible: boolean
  isBest: boolean
  isSelected: boolean
}

export interface HaloResolutionProps {
  rows: HaloRow[]
  /** τρέχουσα (χειροκίνητη/επιλεγμένη) συχνότητα εκπομπής */
  selected: { f: number; n: number; rFresnelM: number; rEff: number } | null
  /** συνιστώμενη «ελάχιστο halo» ζώνη */
  best: HaloRow | null
  /** κατώφλι σήματος (0..1) κάτω από το οποίο μια ζώνη θεωρείται πολύ ασθενής */
  floor: number
  materialName: string
  depthM: number
  /** διορθωμένος στόχος (halo→κέντρο) στην ΤΡΕΧΟΥΣΑ συχνότητα */
  corrected: { lat: number; lon: number; shiftM: number; bearingDeg: number } | null
  /** ίδια διόρθωση αν υιοθετηθεί η συνιστώμενη «ελάχιστο halo» συχνότητα */
  correctedBest: { lat: number; lon: number; shiftM: number } | null
  hasDirection: boolean
}

function fmtRadius(m: number): string {
  if (!isFinite(m)) return "—"
  if (m < 1) return `${(m * 100).toFixed(0)} cm`
  return `${m.toFixed(2)} m`
}

export function HaloResolutionPanel({
  rows,
  selected,
  best,
  floor,
  materialName,
  depthM,
  corrected,
  correctedBest,
  hasDirection,
}: HaloResolutionProps) {
  // Ποσοστό βελτίωσης πλευρικής ευκρίνειας αν πάμε από την τρέχουσα στη συνιστώμενη.
  const improvementPct =
    selected && best && isFinite(selected.rFresnelM) && selected.rFresnelM > 0 && isFinite(best.rFresnelM)
      ? Math.max(0, (1 - best.rFresnelM / selected.rFresnelM) * 100)
      : 0

  return (
    <Panel
      step="7β"
      title="Ανάλυση halo & πλευρική ευκρίνεια"
      desc={
        <>
          Το «halo» είναι η πλευρική ζώνη γύρω από τον στόχο όπου το πεδίο παραμένει αρκετά ισχυρό ώστε να
          αντιδράσουν οι βέργες — γι&apos; αυτό ο χειριστής «κλειδώνει» στην άκρη, όχι στο κέντρο. Το εύρος της
          ισούται κατά προσέγγιση με την πρώτη ζώνη Fresnel{" "}
          <span className="font-mono text-foreground">r_F = √(λ·d)</span>. Υψηλότερη αρμονική → μικρότερο r_F →
          σφιχτότερο halo, αρκεί το σήμα να επιστρέφει επαρκές.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Readout
          label="Halo στην τρέχουσα συχνότητα"
          value={selected ? fmtRadius(selected.rFresnelM) : "—"}
          tone="brass"
        />
        <Readout
          label="Ελάχιστο halo (συνιστώμενο)"
          value={best ? fmtRadius(best.rFresnelM) : "—"}
          tone="phosphor"
        />
        <Readout
          label="Βελτίωση ευκρίνειας"
          value={improvementPct > 0 ? improvementPct.toFixed(0) : "0"}
          unit="%"
          tone={improvementPct > 5 ? "phosphor" : "muted"}
        />
      </div>

      {best && (
        <div className="mt-4 rounded-sm border border-phosphor-dim bg-readout px-3.5 py-3 font-mono text-[0.76rem] leading-relaxed text-phosphor">
          ★ Συνιστώμενη συχνότητα ελάχιστου halo: ζώνη «{best.label}» · n={best.n} ·{" "}
          <span className="text-foreground">{fmtHzOnly(best.f)}</span> → πλευρική ακτίνα ≈{" "}
          {fmtRadius(best.rFresnelM)} με επιστρεφόμενο σήμα {(best.signalRel * 100).toFixed(0)}% της κορυφής.
          Θέσε αυτή τη συχνότητα στη γεννήτρια (ανάλογα με το κανάλι) για μικρότερο halo και μέτρηση πιο κοντά
          στον πραγματικό στόχο ({materialName}, βάθος {depthM.toFixed(2)} m).
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-sm border border-panel-line bg-readout">
        <table className="w-full font-mono text-[0.72rem]">
          <thead>
            <tr className="border-b border-panel-line text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Ζώνη</th>
              <th className="px-3 py-2 font-medium">n</th>
              <th className="px-3 py-2 font-medium">Συχνότητα</th>
              <th className="px-3 py-2 font-medium">Ακτίνα halo r_F</th>
              <th className="px-3 py-2 font-medium">Σήμα</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = r.isBest
                ? "text-phosphor"
                : !r.eligible
                  ? "text-destructive"
                  : "text-foreground"
              return (
                <tr
                  key={r.label}
                  className={
                    "border-b border-panel-line/60 last:border-0 " +
                    (r.isBest ? "bg-secondary/40" : r.isSelected ? "bg-panel/60" : "")
                  }
                >
                  <td className={"px-3 py-2 " + tone}>
                    {r.isBest ? "★ " : r.isSelected ? "▸ " : ""}
                    {r.label}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.n}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtHzOnly(r.f)}</td>
                  <td className={"px-3 py-2 " + tone}>{fmtRadius(r.rFresnelM)}</td>
                  <td className={"px-3 py-2 " + (r.eligible ? "text-muted-foreground" : "text-destructive")}>
                    {(r.signalRel * 100).toFixed(0)}%{!r.eligible ? " ⚠" : ""}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
        «Σήμα» = επιστρεφόμενο πλάτος (round-trip) κανονικοποιημένο στην κορυφή. Ζώνες κάτω από το κατώφλι{" "}
        {(floor * 100).toFixed(0)}% (⚠) θεωρούνται πολύ ασθενείς — το σφιχτό halo τους δεν αξιοποιείται γιατί ο
        στόχος δεν επιστρέφει αρκετό σήμα.
      </p>

      {/* Feature 3 — Διόρθωση θέσης: από την άκρη του halo προς το κέντρο (τον στόχο) */}
      <div className="mt-5 border-t border-panel-line pt-4">
        <h3 className="mb-1.5 font-display text-sm font-bold text-foreground">
          Διόρθωση θέσης: halo → πραγματικός στόχος
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Το σημείο που κλείδωσαν οι βέργες βρίσκεται στην περίμετρο του halo, στραμμένο προς τον χειριστή. Ο
          πραγματικός στόχος είναι ~r_F πιο μέσα, προς την κατεύθυνση της γεννήτριας (πηγής).
        </p>
        {hasDirection && corrected ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Readout
                label="Διορθωμένος στόχος (τρέχουσα f)"
                value={`${corrected.lat.toFixed(6)}, ${corrected.lon.toFixed(6)}`}
                tone="phosphor"
              />
              <Readout label="Μετατόπιση προς τα μέσα" value={corrected.shiftM.toFixed(2)} unit="m" tone="brass" />
              <Readout label="Κατεύθυνση (προς γεννήτρια)" value={corrected.bearingDeg.toFixed(0)} unit="°" />
            </div>
            {correctedBest && best && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Readout
                  label="Διορθωμένος στόχος (συνιστώμενη f)"
                  value={`${correctedBest.lat.toFixed(6)}, ${correctedBest.lon.toFixed(6)}`}
                  tone="phosphor"
                />
                <Readout
                  label="Μετατόπιση (συνιστώμενη f)"
                  value={correctedBest.shiftM.toFixed(2)}
                  unit="m"
                  tone="muted"
                />
              </div>
            )}
            <p className="mt-3 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
              Η διόρθωση μετακινεί το σημείο των βεργών κατά r_F προς τη γεννήτρια. Το πλευρικό drift διάθλασης
              (§7·§6) είναι ξεχωριστός όρος κατά μήκος του γεωμαγνητικού άξονα και το πρόσημό του καθορίζεται
              επιτοπίως — εφάρμοσέ το επιπρόσθετα αν χρειάζεται.
            </p>
          </>
        ) : (
          <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.72rem] text-muted-foreground">
            Όρισε διαφορετικές συντεταγμένες γεννήτριας και τελικού σημείου (§7) ώστε να υπάρχει κατεύθυνση για τη
            διόρθωση halo → στόχου.
          </p>
        )}
      </div>
    </Panel>
  )
}
