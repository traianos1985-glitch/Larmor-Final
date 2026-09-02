"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Plus, Target, Trash2 } from "lucide-react"
import { Panel, Field, Readout, inputClass, buttonClass } from "./primitives"
import { triangulate, validateLat, validateLon, type TriStation } from "@/lib/physics"

const TriangulationMap = dynamic(() => import("./triangulation-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
      Φόρτωση χάρτη…
    </div>
  ),
})

let seq = 0
const mkId = () => `st_${Date.now()}_${seq++}`

function fmtEllipseAxis(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—"
  if (m < 1000) return m.toFixed(1) + " m"
  return (m / 1000).toFixed(2) + " km"
}

function fmtArea(m2: number): string {
  if (!Number.isFinite(m2) || m2 <= 0) return "—"
  if (m2 < 10000) return m2.toFixed(0) + " m²"
  return (m2 / 1e6).toFixed(3) + " km²"
}

export function TriangulationPanel({
  currentGenerator,
  currentBearing,
}: {
  currentGenerator: { lat: number; lon: number }
  currentBearing: number
}) {
  const KEY = "larmor-triangulation-v1"
  const [stations, setStations] = useState<TriStation[]>([])
  const [angUnc, setAngUnc] = useState(3)
  const restored = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (Array.isArray(s.stations)) setStations(s.stations)
        if (Number.isFinite(s.angUnc)) setAngUnc(s.angUnc)
      }
    } catch (e) {
      console.warn("[v0] Triangulation restore failed:", e)
    }
    restored.current = true
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify({ stations, angUnc }))
    } catch (e) {
      console.warn("[v0] Triangulation save failed:", e)
    }
  }, [stations, angUnc])

  const result = useMemo(() => triangulate(stations, angUnc), [stations, angUnc])
  const validCount = stations.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Number.isFinite(s.bearingDeg),
  ).length

  function addCurrent() {
    setStations((prev) => [
      ...prev,
      {
        id: mkId(),
        lat: Number((currentGenerator.lat ?? 0).toFixed(6)),
        lon: Number((currentGenerator.lon ?? 0).toFixed(6)),
        bearingDeg: Number((currentBearing || 0).toFixed(1)),
      },
    ])
  }

  function addEmpty() {
    setStations((prev) => [
      ...prev,
      {
        id: mkId(),
        lat: Number((currentGenerator.lat ?? 37.9838).toFixed(6)),
        lon: Number((currentGenerator.lon ?? 23.7275).toFixed(6)),
        bearingDeg: 0,
      },
    ])
  }

  function update(id: string, patch: Partial<TriStation>) {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: string) {
    setStations((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Panel
      step="8"
      title="Τριγωνισμός · Σύγκλιση πολλαπλών μετρήσεων"
      desc="Κατέγραψε 2-3 (ή περισσότερες) θέσεις γεννήτριας, καθεμιά με τη διόπτευση που δείχνουν οι βέργες προς τον στόχο. Το σημείο τομής των διευθύνσεων υπολογίζεται αυτόματα με σταθμισμένα ελάχιστα τετράγωνα, μαζί με τη «ζώνη αβεβαιότητας» (error ellipse 95%) γύρω του."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={addCurrent}>
          <Target className="size-4" /> Καταγραφή τρέχουσας μέτρησης
        </button>
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={addEmpty}>
          <Plus className="size-4" /> Προσθήκη κενής θέσης
        </button>
        {stations.length > 0 && (
          <button
            type="button"
            className={buttonClass + " flex items-center gap-2"}
            onClick={() => setStations([])}
          >
            <Trash2 className="size-4" /> Καθαρισμός όλων
          </button>
        )}
        <span className="ml-auto font-mono text-[0.68rem] text-muted-foreground">
          {validCount} έγκυρες διευθύνσεις
        </span>
      </div>

      <div className="mb-4 max-w-xs">
        <Field label="Γωνιακή αβεβαιότητα διόπτευσης σθ (°)" htmlFor="ang-unc">
          <input
            id="ang-unc"
            type="number"
            step="0.5"
            min={0.1}
            max={30}
            className={inputClass}
            value={angUnc}
            onChange={(e) => setAngUnc(Math.max(0.1, Math.min(30, Number.parseFloat(e.target.value) || 3)))}
          />
          <span className="mt-1 block font-mono text-[0.6rem] text-muted-foreground">
            καθορίζει το μέγεθος της ζώνης αβεβαιότητας (τυπικά 2–5° για βέργες)
          </span>
        </Field>
      </div>

      {/* Λίστα σταθμών */}
      {stations.length === 0 ? (
        <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
          Δεν έχουν καταγραφεί θέσεις. Πάτησε «Καταγραφή τρέχουσας μέτρησης» για να προσθέσεις τη γεννήτρια και τη
          διόπτευση από το §7, ή «Προσθήκη κενής θέσης» για χειροκίνητη εισαγωγή. Χρειάζονται τουλάχιστον 2 διευθύνσεις.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {stations.map((s, idx) => (
            <div
              key={s.id}
              className="grid grid-cols-1 gap-3 rounded-sm border border-panel-line bg-readout p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end"
            >
              <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-phosphor-dim font-mono text-xs font-bold text-background">
                {idx + 1}
              </span>
              <Field label="Πλάτος γεννήτριας" htmlFor={`tri-lat-${s.id}`} warn={validateLat(s.lat)}>
                <input
                  id={`tri-lat-${s.id}`}
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  className={inputClass}
                  value={Number.isFinite(s.lat) ? s.lat : ""}
                  onChange={(e) => update(s.id, { lat: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <Field label="Μήκος γεννήτριας" htmlFor={`tri-lon-${s.id}`} warn={validateLon(s.lon)}>
                <input
                  id={`tri-lon-${s.id}`}
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  className={inputClass}
                  value={Number.isFinite(s.lon) ? s.lon : ""}
                  onChange={(e) => update(s.id, { lon: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <Field label="Διόπτευση προς στόχο (°)" htmlFor={`tri-brg-${s.id}`}>
                <input
                  id={`tri-brg-${s.id}`}
                  type="number"
                  step="0.1"
                  min={0}
                  max={360}
                  className={inputClass}
                  value={Number.isFinite(s.bearingDeg) ? s.bearingDeg : ""}
                  onChange={(e) => update(s.id, { bearingDeg: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <button
                type="button"
                aria-label={`Διαγραφή θέσης ${idx + 1}`}
                className="flex items-center justify-center gap-1.5 self-center rounded-sm border border-panel-line px-2.5 py-2 font-mono text-[0.7rem] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="size-3.5" /> <span className="sm:hidden">Διαγραφή</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Αποτέλεσμα */}
      {result && !result.ok && (
        <div
          className="mt-4 rounded-sm border px-3.5 py-3 font-mono text-[0.76rem] leading-relaxed"
          style={{ borderColor: "var(--destructive)", background: "oklch(0.3 0.05 35 / 0.15)", color: "var(--destructive)" }}
        >
          ⚠ {result.reason}
        </div>
      )}

      {result?.ok && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Readout
              label="Εκτιμώμενος στόχος (τομή)"
              value={`${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`}
              tone="phosphor"
            />
            <Readout
              label="Ζώνη αβεβαιότητας 95%"
              value={fmtArea(result.areaM2)}
              tone="brass"
            />
            <Readout
              label="Σύγκλιση διευθύνσεων (RMS)"
              value={result.rmsResidualM.toFixed(2)}
              unit="m"
              tone={result.rmsResidualM < 5 ? "phosphor" : "brass"}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Readout label="Μεγάλος ημιάξονας" value={fmtEllipseAxis(result.semiMajorM)} tone="muted" />
            <Readout label="Μικρός ημιάξονας" value={fmtEllipseAxis(result.semiMinorM)} tone="muted" />
            <Readout label="Προσανατολισμός άξονα" value={result.orientationDeg.toFixed(0)} unit="°" tone="muted" />
          </div>

          <div className="mt-4 h-72 overflow-hidden rounded-sm border border-panel-line">
            <TriangulationMap stations={stations} result={result} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.66rem] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-phosphor" /> διευθύνσεις γεννήτριας
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ background: "#ff5c5c" }} /> εκτιμώμενος στόχος
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: "#e6b85c", opacity: 0.6 }} /> ζώνη αβεβαιότητας 95%
            </span>
          </div>

          <p className="mt-3 rounded-sm border border-brass-dim/50 bg-secondary/30 px-3 py-2.5 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
            Η ακρίβεια πολλαπλασιάζεται με τον συνδυασμό μετρήσεων: το σημείο τομής προκύπτει από σταθμισμένα ελάχιστα
            τετράγωνα όλων των διευθύνσεων, ενώ η έλλειψη 95% αποτυπώνει τη γεωμετρική αβεβαιότητα. Μικρό RMS και μικρή
            έλλειψη → πιο αξιόπιστη εκτίμηση. Καλύτερη γεωμετρία επιτυγχάνεται όταν οι διευθύνσεις τέμνονται κοντά στις 90°.
          </p>
        </>
      )}
    </Panel>
  )
}
