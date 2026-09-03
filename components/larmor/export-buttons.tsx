"use client"

import { Panel, buttonClass } from "./primitives"
import { type Material, fmtHzOnly } from "@/lib/physics"

type ExportState = {
  mat: Material
  f0: number
  bfield: number
  bSource: string
  lat: number
  lon: number
  elev: number
  date: string
  maxharm: number
  sigmaSoil: number
  selectedN: number
  fSelected: number
  deltaSoil: number
  deltaMetal: number
  targetDepth: number
  rMm: number
  generatorLat: number
  generatorLon: number
  generatorFrequency: number
  rodLengthCm: number
  rodSpacingCm: number
  observedLat: number
  observedLon: number
  estimateDistanceKm: number
  estimateBearingDeg: number
  estimateConfidence: number
  estimateQualityGrade: string
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportButtons({ state }: { state: ExportState }) {
  const material = state.mat
  const matLabel = material.name
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  function exportJson() {
    const payload = {
      generated_at: new Date().toISOString(),
      tool: "Larmor & Αρμονικές — rev.2 (Next.js)",
      location: { lat: state.lat, lon: state.lon, elevation_m: state.elev, date: state.date },
      // Το state.bfield είναι σε µT: 1 µT = 1e3 nT = 1e-6 T.
      geomagnetic_field_nT: state.bfield * 1e3,
      geomagnetic_field_T: state.bfield * 1e-6,
      field_source: state.bSource,
      // Η σταθερά γ/2π αποθηκεύεται σε MHz/T (βλ. lib/physics.ts).
      material: { key: state.mat.id, label: matLabel, gamma_MHz_per_T: material.gamma },
      larmor_f0_hz: state.f0,
      selected_harmonic: { n: state.selectedN, frequency_hz: state.fSelected },
      max_harmonics: state.maxharm,
      soil_conductivity_S_per_m: state.sigmaSoil,
      skin_depth_soil_m: state.deltaSoil,
      skin_depth_metal_m: state.deltaMetal,
      target_depth_m: state.targetDepth,
      target_radius_mm: state.rMm,
      experiment: {
        generator_position: { lat: state.generatorLat, lon: state.generatorLon },
        transmitter_frequency_hz: state.generatorFrequency,
        electrodes: { material: "μπρούτζος", length_cm: state.rodLengthCm, spacing_cm: state.rodSpacingCm },
        observed_position: { lat: state.observedLat, lon: state.observedLon },
        estimate: { distance_km: state.estimateDistanceKm, bearing_deg: state.estimateBearingDeg, confidence_percent: state.estimateConfidence, quality_grade: state.estimateQualityGrade },
      },
    }
    download(`larmor-${matLabel}-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json")
  }

  function exportReport() {
    const lines = [
      "════════════════════════════════════════════",
      "  LARMOR & ΑΡΜΟΝΙΚΕΣ — ΑΝΑΦΟΡΑ ΜΕΤΡΗΣΗΣ",
      "════════════════════════════════════════════",
      "",
      `Ημερομηνία αναφοράς : ${new Date().toLocaleString("el-GR")}`,
      "",
      "── ΤΟΠΟΘΕΣΙΑ ──────────────────────────────",
      `Γεωγρ. πλάτος       : ${state.lat.toFixed(6)}°`,
      `Γεωγρ. μήκος        : ${state.lon.toFixed(6)}°`,
      `Υψόμετρο            : ${state.elev} m`,
      `Ημερομηνία μοντέλου : ${state.date}`,
      "",
      "── ΓΕΩΜΑΓΝΗΤΙΚΟ ΠΕΔΙΟ ─────────────────────",
      `Ένταση B            : ${(state.bfield * 1e3).toFixed(1)} nT  (${(state.bfield * 1e-6).toExponential(4)} T)`,
      `Πηγή                : ${state.bSource}`,
      "",
      "── ΜΕΤΑΛΛΟ & LARMOR ───────────────────────",
      `Μέταλλο             : ${matLabel}`,
      `Σταθερά γ            : ${material.gamma?.toExponential(4) ?? "—"} MHz/T`,
      `Συχνότητα Larmor f₀  : ${fmtHzOnly(state.f0)}`,
      "",
      "── ΑΡΜΟΝΙΚΕΣ ──────────────────────────────",
      `Μέγιστη αρμονική     : ${state.maxharm}`,
      `Επιλεγμένη αρμονική  : n=${state.selectedN} → ${fmtHzOnly(state.fSelected)}`,
      "",
      "── ΒΑΘΟΣ ΔΙΕΙΣΔΥΣΗΣ (SKIN DEPTH) ──────────",
      `Αγωγιμότητα εδάφους  : ${state.sigmaSoil} S/m`,
      `δ εδάφους            : ${state.deltaSoil.toExponential(3)} m`,
      `δ μετάλλου           : ${state.deltaMetal.toExponential(3)} m`,
      "",
      "── ΣΤΟΧΟΣ ─────────────────────────────────",
      `Βάθος στόχου         : ${state.targetDepth} m`,
      `Ακτίνα στόχου        : ${state.rMm} mm`,
      "",
      "── ΠΕΙΡΑΜΑΤΙΚΗ ΕΚΤΙΜΗΣΗ ΘΕΣΗΣ ─────────────",
      `Γεννήτρια            : ${state.generatorLat.toFixed(6)}°, ${state.generatorLon.toFixed(6)}°`,
      `Παρατηρούμενο σημείο : ${state.observedLat.toFixed(6)}°, ${state.observedLon.toFixed(6)}°`,
      `Απόσταση σημείων     : ${state.estimateDistanceKm.toFixed(3)} km`,
      `Διόπτευση            : ${state.estimateBearingDeg.toFixed(1)}°`,
      `Ποιότητα μέτρησης    : ${state.estimateConfidence.toFixed(0)}/100 (${state.estimateQualityGrade})`,
      "",
      "════════════════════════════════════════════",
      "Επιστημονική σημείωση: Η χρήση των συχνοτήτων",
      "Larmor ως μέθοδος ανίχνευσης μετάλλων εξ",
      "αποστάσεως είναι ΠΕΙΡΑΜΑΤΙΚΗ και μη",
      "επιβεβαιωμένη. Για εκπαιδευτική χρήση.",
      "════════════════════════════════════════════",
    ]
    download(`larmor-report-${stamp}.txt`, lines.join("\n"), "text/plain;charset=utf-8")
  }

  return (
    <Panel title="Εξαγωγή" desc="Αποθήκευση τρέχουσας κατάστασης">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={exportReport}>
          Αναφορά (.txt)
        </button>
        <button type="button" className={buttonClass} onClick={exportJson}>
          Δεδομένα (.json)
        </button>
      </div>
    </Panel>
  )
}
