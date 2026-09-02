"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Crosshair, Plus, Trash2, Target } from "lucide-react"
import { Panel, Field, Readout, inputClass, buttonClass } from "./primitives"
import { triangulateBearings, validateLat, validateLon, type Sighting } from "@/lib/physics"

const TriangulationMap = dynamic(() => import("./triangulation-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">Φόρτωση χάρτη…</div>
  ),
})

export function TriangulationPanel({
  sightings,
  setSightings,
  defaultLat,
  defaultLon,
  defaultBearing,
  onUseAsTarget,
}: {
  sightings: Sighting[]
  setSightings: (s: Sighting[]) => void
  defaultLat: number
  defaultLon: number
  defaultBearing: number
  onUseAsTarget: (lat: number, lon: number) => void
}) {
  const [draftLat, setDraftLat] = useState(defaultLat)
  const [draftLon, setDraftLon] = useState(defaultLon)
  const [draftBearing, setDraftBearing] = useState(defaultBearing)
  const [gpsStatus, setGpsStatus] = useState("")

  const result = useMemo(() => triangulateBearings(sightings), [sightings])

  function addSighting() {
    if (!Number.isFinite(draftLat) || !Number.isFinite(draftLon) || !Number.isFinite(draftBearing)) return
    const bearing = ((draftBearing % 360) + 360) % 360
    setSightings([
      ...sightings,
      { id: "sight_" + Date.now(), lat: Number(draftLat.toFixed(6)), lon: Number(draftLon.toFixed(6)), bearingDeg: Number(bearing.toFixed(1)) },
    ])
  }

  function removeSighting(id: string) {
    setSightings(sightings.filter((s) => s.id !== id))
  }

  function updateSighting(id: string, patch: Partial<Sighting>) {
    setSightings(sightings.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function useGpsForDraft() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("Το GPS δεν υποστηρίζεται σε αυτή τη συσκευή.")
      return
    }
    setGpsStatus("Αναμονή άδειας τοποθεσίας…")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraftLat(Number(pos.coords.latitude.toFixed(6)))
        setDraftLon(Number(pos.coords.longitude.toFixed(6)))
        const acc = pos.coords.accuracy
        setGpsStatus(`Θέση σταθμού OK${Number.isFinite(acc) ? ` (±${Math.round(acc)} m)` : ""}.`)
      },
      (err) => setGpsStatus("Σφάλμα GPS: " + err.message),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const geomTone = result ? (result.minAngleDeg >= 30 ? "phosphor" : result.minAngleDeg >= 15 ? "brass" : "brass") : "muted"

  return (
    <Panel
      step="7β"
      title="Τριγωνισμός — Σύγκλιση πολλαπλών διοπτεύσεων"
      desc="Πάρε μετρήσεις από 2+ διαφορετικές θέσεις. Σε κάθε θέση κατέγραψε τη διόπτευση (αζιμούθιο) προς το σημείο που δείχνουν οι βέργες. Η τομή των ημιευθειών δίνει πολύ πιο αξιόπιστη εκτίμηση θέσης στόχου από μία μόνο μέτρηση, μαζί με ζώνη αβεβαιότητας."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Αριστερά: εισαγωγή & λίστα διοπτεύσεων */}
        <div className="flex flex-col gap-3">
          <div className="rounded-sm border border-panel-line bg-readout p-3">
            <p className="mb-2.5 font-mono text-[0.72rem] uppercase tracking-wide text-brass">Νέα διόπτευση (σταθμός)</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Πλάτος" htmlFor="tri-lat" warn={validateLat(draftLat)}>
                <input id="tri-lat" type="number" step="0.000001" min={-90} max={90} className={inputClass} value={Number.isFinite(draftLat) ? draftLat : ""} onChange={(e) => setDraftLat(Number.parseFloat(e.target.value))} />
              </Field>
              <Field label="Μήκος" htmlFor="tri-lon" warn={validateLon(draftLon)}>
                <input id="tri-lon" type="number" step="0.000001" min={-180} max={180} className={inputClass} value={Number.isFinite(draftLon) ? draftLon : ""} onChange={(e) => setDraftLon(Number.parseFloat(e.target.value))} />
              </Field>
              <Field label="Αζιμούθιο °" htmlFor="tri-bear">
                <input id="tri-bear" type="number" step="0.1" min={0} max={360} className={inputClass} value={Number.isFinite(draftBearing) ? draftBearing : ""} onChange={(e) => setDraftBearing(Number.parseFloat(e.target.value))} />
              </Field>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={useGpsForDraft} className={buttonClass + " flex flex-1 items-center justify-center gap-2"}>
                <Crosshair className="size-3.5" /> GPS θέσης
              </button>
              <button type="button" onClick={addSighting} className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-phosphor-dim bg-secondary/40 px-3 py-2 font-mono text-[0.72rem] uppercase tracking-wide text-phosphor transition-colors hover:bg-secondary/60">
                <Plus className="size-3.5" /> Προσθήκη
              </button>
            </div>
            {gpsStatus && <p className="mt-1.5 font-mono text-[0.66rem] text-muted-foreground">{gpsStatus}</p>}
          </div>

          <div className="rounded-sm border border-panel-line bg-readout p-3">
            <p className="mb-2 flex items-center justify-between font-mono text-[0.72rem] uppercase tracking-wide text-brass">
              <span>Διοπτεύσεις</span>
              <span className="text-muted-foreground">{sightings.length} σταθμοί</span>
            </p>
            {sightings.length === 0 ? (
              <p className="py-3 text-center font-mono text-[0.7rem] text-muted-foreground">Δεν υπάρχουν διοπτεύσεις ακόμη — πρόσθεσε τουλάχιστον 2.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sightings.map((s, i) => (
                  <li key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-sm border border-panel-line bg-panel px-2 py-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-phosphor/20 font-mono text-[0.66rem] text-phosphor">{i + 1}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input type="number" step="0.000001" aria-label={`Πλάτος σταθμού ${i + 1}`} className={inputClass + " px-1.5 py-1 text-[0.66rem]"} value={s.lat} onChange={(e) => updateSighting(s.id, { lat: Number.parseFloat(e.target.value) })} />
                      <input type="number" step="0.000001" aria-label={`Μήκος σταθμού ${i + 1}`} className={inputClass + " px-1.5 py-1 text-[0.66rem]"} value={s.lon} onChange={(e) => updateSighting(s.id, { lon: Number.parseFloat(e.target.value) })} />
                      <input type="number" step="0.1" aria-label={`Αζιμούθιο σταθμού ${i + 1}`} className={inputClass + " px-1.5 py-1 text-[0.66rem]"} value={s.bearingDeg} onChange={(e) => updateSighting(s.id, { bearingDeg: Number.parseFloat(e.target.value) })} />
                    </div>
                    <button type="button" aria-label={`Διαγραφή σταθμού ${i + 1}`} onClick={() => removeSighting(s.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Δεξιά: χάρτης */}
        <div className="flex flex-col gap-2">
          <div className="h-72 overflow-hidden rounded-sm border border-panel-line lg:h-full lg:min-h-[20rem]">
            <TriangulationMap sightings={sightings} result={result} />
          </div>
          <p className="font-mono text-[0.66rem] text-muted-foreground">
            <span className="text-phosphor">━━</span> ημιευθείες διόπτευσης · <span className="text-brass">◯</span> σημείο τομής + ζώνη αβεβαιότητας
          </p>
        </div>
      </div>

      {/* Αποτέλεσμα τριγωνισμού */}
      {result ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Readout label="Εκτιμώμενος στόχος (τομή)" value={`${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`} tone="phosphor" />
            <Readout label="Αβεβαιότητα (RMS)" value={`±${result.uncertaintyM.toFixed(1)}`} unit="m" tone={result.uncertaintyM < 25 ? "phosphor" : "brass"} />
            <Readout label="Γωνία τομής (min)" value={result.minAngleDeg.toFixed(0)} unit="°" tone={geomTone} />
            <Readout label="Ενεργές διοπτεύσεις" value={`${result.forwardCount}/${result.used}`} tone="muted" />
          </div>
          <div
            className="mt-3 rounded-sm border px-3.5 py-3 font-mono text-[0.74rem] leading-relaxed"
            style={
              result.ok
                ? { borderColor: "var(--phosphor-dim)", background: "oklch(0.4 0.08 155 / 0.08)", color: "var(--phosphor)" }
                : { borderColor: "var(--brass-dim)", background: "oklch(0.4 0.08 75 / 0.08)", color: "var(--brass)" }
            }
          >
            {result.forwardCount < result.used
              ? "⚠ Κάποιες διοπτεύσεις δείχνουν αντίθετα από την τομή — έλεγξε τα αζιμούθια (ίσως χρειάζονται +180°)."
              : result.minAngleDeg < 15
                ? "⚠ Πολύ μικρή γωνία τομής — οι σταθμοί είναι σχεδόν ευθυγραμμισμένοι. Πάρε μέτρηση από πλάγια θέση για καλύτερη ακρίβεια."
                : result.uncertaintyM > 50
                  ? "⚠ Μεγάλη διασπορά διοπτεύσεων — οι γραμμές δεν συγκλίνουν καλά. Επανέλεγξε τις μετρήσεις αζιμουθίου."
                  : "✓ Καλή σύγκλιση — οι διοπτεύσεις τέμνονται συνεπώς. Η εκτίμηση θέσης είναι αξιόπιστη εντός της ζώνης αβεβαιότητας."}
          </div>
          <button
            type="button"
            onClick={() => onUseAsTarget(Number(result.lat.toFixed(6)), Number(result.lon.toFixed(6)))}
            className="mt-3 flex items-center justify-center gap-2 rounded-sm border border-brass bg-brass/15 px-4 py-2.5 font-mono text-[0.74rem] uppercase tracking-wide text-brass transition-colors hover:bg-brass/25"
          >
            <Target className="size-4" /> Χρήση ως τελικός στόχος (§7)
          </button>
        </>
      ) : (
        <p className="mt-4 rounded-sm border border-panel-line bg-secondary/30 px-3.5 py-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
          Χρειάζονται τουλάχιστον 2 διοπτεύσεις από διαφορετικές θέσεις για υπολογισμό τομής. Ιδανικά 3+ με γωνίες τομής κοντά στις 90° για ελάχιστη αβεβαιότητα.
        </p>
      )}
    </Panel>
  )
}
