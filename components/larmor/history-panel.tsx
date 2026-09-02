"use client"

import { useEffect, useState } from "react"
import { MapPin, Save, Download, Trash2, X } from "lucide-react"
import { Panel, Field, inputClass, selectClass, buttonClass } from "./primitives"
import { fmtHzOnly } from "@/lib/physics"

export interface Measurement {
  id: string
  timestamp: string
  material_id: string
  material_name: string
  B_uT: number
  f0_hz: number
  unit_mult: number
  equiv_radius_mm: number
  selected_n: number
  selected_freq_hz: number
  soil_type: string
  theta1_deg: number
  h_m: number
  depth_m: number
  drift_x_total_m: number
  drift_axis: string
  drift_dir1: string
  drift_dir2: string
  dipole_axis: string
  lat: number
  lon: number
  generator_lat: number
  generator_lon: number
  generator_freq_hz: number
  generator_band: string
  target_lat: number
  target_lon: number
  target_bearing_deg: number
  target_distance_km: number
  target_confidence: number
  notes: string
}

interface Area {
  id: string
  name: string
  lat: number
  lon: number
  created: string
  measurements: Measurement[]
}

interface HistData {
  version: number
  areas: Record<string, Area>
}

const HIST_KEY = "larmor-history-v1"

function histLoad(): HistData {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    return raw ? JSON.parse(raw) : { version: 1, areas: {} }
  } catch {
    return { version: 1, areas: {} }
  }
}

function histSave(data: HistData) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn("[v0] History save failed:", e)
  }
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function HistoryPanel({
  lat,
  lon,
  capture,
}: {
  lat: number
  lon: number
  capture: () => Measurement
}) {
  const [data, setData] = useState<HistData>({ version: 1, areas: {} })
  const [areaSel, setAreaSel] = useState("__new__")
  const [areaName, setAreaName] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    setData(histLoad())
  }, [])

  function persist(next: HistData) {
    setData(next)
    histSave(next)
  }

  function addMeasurement() {
    const next = structuredClone(data)
    let areaId: string
    if (areaSel === "__new__") {
      if (!areaName.trim()) {
        setStatus({ msg: "Δώσε όνομα νέας περιοχής.", ok: false })
        return
      }
      areaId = "area_" + Date.now()
      next.areas[areaId] = {
        id: areaId,
        name: areaName.trim(),
        lat,
        lon,
        created: new Date().toISOString(),
        measurements: [],
      }
    } else {
      areaId = areaSel
      if (!next.areas[areaId]) {
        setStatus({ msg: "Η περιοχή δεν βρέθηκε.", ok: false })
        return
      }
    }
    const meas = capture()
    meas.notes = notes
    next.areas[areaId].measurements.push(meas)
    persist(next)
    setNotes("")
    setAreaName("")
    setAreaSel(areaId)
    setStatus({ msg: "Αποθηκεύτηκε σε: " + next.areas[areaId].name, ok: true })
  }

  function delMeasurement(areaId: string, measId: string) {
    const next = structuredClone(data)
    if (next.areas[areaId]) {
      next.areas[areaId].measurements = next.areas[areaId].measurements.filter((m) => m.id !== measId)
      persist(next)
    }
  }

  function delArea(areaId: string) {
    const next = structuredClone(data)
    delete next.areas[areaId]
    persist(next)
    if (areaSel === areaId) setAreaSel("__new__")
    setStatus({ msg: "Περιοχή διαγράφηκε.", ok: true })
  }

  const CSV_HEADER =
    "Περιοχή,Lat,Lon,Ημερομηνία,Υλικό,f0_Hz,n,Συχνότητα_Hz,Drift_m,Άξονας,Κατεύθυνση,Βάθος_m," +
    "Γεννήτρια_Lat,Γεννήτρια_Lon,Γεννήτρια_Συχνότητα_Hz,Γεννήτρια_Ζώνη," +
    "Στόχος_Lat,Στόχος_Lon,Στόχος_Διόπτευση_deg,Στόχος_Απόσταση_km,Στόχος_Εμπιστοσύνη_%,Σημειώσεις"

  function measurementRow(area: Area, m: Measurement): string {
    return [
      `"${area.name}"`,
      area.lat,
      area.lon,
      m.timestamp,
      `"${m.material_name}"`,
      m.f0_hz,
      m.selected_n,
      m.selected_freq_hz,
      m.drift_x_total_m,
      `"${m.drift_axis}"`,
      `"${m.drift_dir1}/${m.drift_dir2}"`,
      m.depth_m,
      m.generator_lat,
      m.generator_lon,
      m.generator_freq_hz,
      `"${m.generator_band}"`,
      m.target_lat,
      m.target_lon,
      m.target_bearing_deg,
      m.target_distance_km,
      m.target_confidence,
      `"${m.notes || ""}"`,
    ].join(",")
  }

  function slugify(name: string): string {
    return (
      name
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "area"
    )
  }

  function exportCSV() {
    const lines = [
      "# Larmor & Αρμονικές — Ιστορικό Μετρήσεων",
      "# Export: " + new Date().toISOString(),
      "",
      CSV_HEADER,
    ]
    Object.values(data.areas).forEach((area) => {
      area.measurements.forEach((m) => lines.push(measurementRow(area, m)))
    })
    downloadFile(`larmor-history-${Date.now()}.csv`, lines.join("\n"), "text/csv")
  }

  function exportAreaCSV(area: Area) {
    const lines = [
      "# Larmor & Αρμονικές — Περιοχή: " + area.name,
      "# Export: " + new Date().toISOString(),
      "",
      CSV_HEADER,
      ...area.measurements.map((m) => measurementRow(area, m)),
    ]
    downloadFile(`larmor-${slugify(area.name)}-${Date.now()}.csv`, lines.join("\n"), "text/csv")
  }

  const areas = Object.values(data.areas)

  return (
    <Panel
      title="Ιστορικό Μετρήσεων ανά Περιοχή"
      desc="Αποθήκευση μετρήσεων ανά τοποθεσία. Υπολογίζεται αυτόματα η απόσταση μεταξύ drift vectors διαφορετικών υλικών στην ίδια περιοχή."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Περιοχή" htmlFor="hist-area-select">
          <select
            id="hist-area-select"
            className={selectClass}
            value={areaSel}
            onChange={(e) => setAreaSel(e.target.value)}
          >
            <option value="__new__">+ Νέα περιοχή…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.measurements.length} μετρ.)
              </option>
            ))}
          </select>
        </Field>
        {areaSel === "__new__" && (
          <Field label="Όνομα νέας περιοχής" htmlFor="hist-area-name">
            <input
              id="hist-area-name"
              className={inputClass}
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
          </Field>
        )}
        <Field label="Σημειώσεις (προαιρετικό)" htmlFor="hist-notes">
          <input id="hist-notes" className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={addMeasurement}>
          <Save className="size-4" /> Αποθήκευση τρέχουσας μέτρησης
        </button>
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={exportCSV}>
          <Download className="size-4" /> Export ιστορικού (CSV)
        </button>
      </div>
      {status && (
        <p className={"mt-2 font-mono text-[0.72rem] " + (status.ok ? "text-phosphor" : "text-destructive")}>
          {status.ok ? "✓ " : "⚠ "}
          {status.msg}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {!areas.length && (
          <p className="rounded-sm border border-panel-line bg-readout px-3 py-3 font-mono text-xs text-muted-foreground">
            Δεν υπάρχουν αποθηκευμένες μετρήσεις ακόμα.
          </p>
        )}
        {areas.map((area) => {
          const pairs: { a: string; b: string; dist: number; axis: string }[] = []
          for (let i = 0; i < area.measurements.length; i++) {
            for (let j = i + 1; j < area.measurements.length; j++) {
              const a = area.measurements[i]
              const b = area.measurements[j]
              if (a.material_id === b.material_id) continue
              pairs.push({
                a: a.material_name.split("(")[0].trim(),
                b: b.material_name.split("(")[0].trim(),
                dist: Math.abs(a.drift_x_total_m - b.drift_x_total_m),
                axis: a.drift_axis,
              })
            }
          }
          return (
            <div key={area.id} className="rounded-sm border border-panel-line bg-readout px-3.5 py-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 font-display text-sm font-bold text-brass">
                  <MapPin className="size-3.5" /> {area.name}
                </span>
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  {area.lat.toFixed(4)}°, {area.lon.toFixed(4)}°
                </span>
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-mono text-[0.68rem] text-brass hover:underline disabled:opacity-40 disabled:hover:no-underline"
                    onClick={() => exportAreaCSV(area)}
                    disabled={!area.measurements.length}
                  >
                    <Download className="size-3" /> Export περιοχής (CSV)
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-mono text-[0.68rem] text-destructive hover:underline"
                    onClick={() => delArea(area.id)}
                  >
                    <Trash2 className="size-3" /> Διαγραφή περιοχής
                  </button>
                </span>
              </div>
              {area.measurements.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[0.7rem]">
                    <thead>
                      <tr className="text-left uppercase tracking-wide text-muted-foreground">
                        <th className="px-1.5 py-1">Ημ/νία</th>
                        <th className="px-1.5 py-1">Υλικό</th>
                        <th className="px-1.5 py-1">n</th>
                        <th className="px-1.5 py-1">Συχνότητα</th>
                        <th className="px-1.5 py-1">Drift</th>
                        <th className="px-1.5 py-1">Κατεύθ.</th>
                        <th className="px-1.5 py-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {area.measurements.map((m) => (
                        <tr key={m.id} className="border-t border-panel-line">
                          <td className="px-1.5 py-1 text-muted-foreground">
                            {new Date(m.timestamp).toLocaleString("el-GR")}
                          </td>
                          <td className="px-1.5 py-1">{m.material_name.split("(")[0].trim()}</td>
                          <td className="px-1.5 py-1 text-muted-foreground">n={m.selected_n.toLocaleString("el-GR")}</td>
                          <td className="px-1.5 py-1 text-phosphor">{fmtHzOnly(m.selected_freq_hz)}</td>
                          <td className="px-1.5 py-1">{m.drift_x_total_m.toFixed(2)}m</td>
                          <td className="px-1.5 py-1 text-muted-foreground">
                            {m.drift_dir1}/{m.drift_dir2}
                          </td>
                          <td className="px-1.5 py-1">
                            <button
                              type="button"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => delMeasurement(area.id, m.id)}
                              aria-label="Διαγραφή μέτρησης"
                            >
                              <X className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pairs.length > 0 && (
                    <div className="mt-2 border-t border-brass-dim/40 pt-2">
                      <p className="mb-1 font-mono text-[0.66rem] text-brass">
                        Αποστάσεις μεταξύ σημάτων (|drift₁ − drift₂|):
                      </p>
                      {pairs.map((p, i) => (
                        <p key={i} className="font-mono text-[0.66rem] text-muted-foreground">
                          {p.a} — {p.b}: <span className="text-phosphor">{p.dist.toFixed(2)} m</span> ({p.axis})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-mono text-[0.7rem] text-muted-foreground">Καμία μέτρηση.</p>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
