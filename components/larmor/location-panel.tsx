"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { MapPin, Radio, Calculator, Crosshair, Mountain } from "lucide-react"
import { Panel, Field, Readout, inputClass, buttonClass } from "./primitives"
import { computeDipoleField, computeDipoleInclination } from "@/lib/physics"
import {
  fetchSoilMoisture,
  fetchMagneticAnomaly,
  suggestSoilFromMoisture,
  suggestRefractionSoilFromMoisture,
  mineralizationTier,
  type SoilMoistureResult,
  type MagneticAnomalyResult,
} from "@/lib/geo-soil"

export interface GeoSoilResult {
  moisture: SoilMoistureResult | null
  anomaly: MagneticAnomalyResult | null
}

const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
      Φόρτωση χάρτη…
    </div>
  ),
})

export interface GeomagResult {
  D: number
  I: number
  F: number
  H: number
  X: number
  Y: number
  Z: number
  uncertainty: number | null
  secularVariation: { D: number | null; I: number | null; F: number | null }
  source: string
}

export function LocationPanel({
  lat,
  lon,
  elev,
  date,
  bfield,
  bSource,
  geomag,
  setLat,
  setLon,
  setElev,
  setDate,
  onBResult,
  onGeomag,
  onSoilSuggest,
  onGeoSoil,
  generatorLat,
  generatorLon,
  observedLat,
  observedLon,
  setGeneratorLat,
  setGeneratorLon,
  setObservedLat,
  setObservedLon,
}: {
  lat: number
  lon: number
  elev: number
  date: string
  bfield: number
  bSource: string
  geomag: GeomagResult
  setLat: (v: number) => void
  setLon: (v: number) => void
  setElev: (v: number) => void
  setDate: (v: string) => void
  onBResult: (uT: number, source: string) => void
  onGeomag: (g: GeomagResult) => void
  generatorLat: number
  generatorLon: number
  observedLat: number
  observedLon: number
  setGeneratorLat: (v: number) => void
  setGeneratorLon: (v: number) => void
  setObservedLat: (v: number) => void
  setObservedLon: (v: number) => void
}) {
  const [status, setStatus] = useState("Αναμονή")
  const [statusTone, setStatusTone] = useState<"muted" | "phosphor" | "brass">("muted")
  const [busy, setBusy] = useState(false)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("Το geolocation δεν υποστηρίζεται.")
      setStatusTone("brass")
      return
    }
    setGpsBusy(true)
    setStatus("Αναμονή άδειας τοποθεσίας (υψηλή ακρίβεια GPS)…")
    setStatusTone("muted")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(6))
        const lo = Number(pos.coords.longitude.toFixed(6))
        const acc = Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null
        setGpsAccuracy(acc)
        setLat(la)
        setLon(lo)
        // Μετακίνησε και τη γεννήτρια ώστε ο χάρτης να κεντραριστεί στην τρέχουσα θέση.
        setGeneratorLat(la)
        setGeneratorLon(lo)
        // Το GPS υψόμετρο (ελλειψοειδές) είναι σπάνιο και αναξιόπιστο σε laptop/κινητά.
        // Προτιμούμε πάντα το υψόμετρο εδάφους (ορθομετρικό) από DEM API· το GPS
        // altitude κρατιέται μόνο ως προσωρινή τιμή μέχρι να απαντήσει το DEM.
        const gpsAlt = pos.coords.altitude
        if (Number.isFinite(gpsAlt as number)) {
          setElev(Math.round(gpsAlt as number))
        }
        void fetchElevation(la, lo)
        // Υπολόγισε αμέσως το πεδίο B με το NOAA WMM για τη νέα θέση.
        void fetchLiveB(la, lo)
        setStatus(acc != null ? `Τοποθεσία OK — ακρίβεια ±${acc} m.` : "Τοποθεσία OK — ο χάρτης μεταφέρθηκε.")
        setStatusTone("phosphor")
        setGpsBusy(false)
      },
      (err) => {
        setStatus("Άρνηση/σφάλμα τοποθεσίας: " + err.message)
        setStatusTone("brass")
        setGpsBusy(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  async function fetchElevation(latArg: number, lonArg: number) {
    if (!Number.isFinite(latArg) || !Number.isFinite(lonArg)) return
    // Δύο ανεξάρτητοι DEM providers· αν ο πρώτος αποτύχει (CORS/δίκτυο), δοκιμάζεται ο δεύτερος.
    const providers: Array<{ name: string; url: string; parse: (d: any) => number }> = [
      {
        name: "Open-Meteo",
        url: `https://api.open-meteo.com/v1/elevation?latitude=${latArg}&longitude=${lonArg}`,
        parse: (d) => (Array.isArray(d?.elevation) ? Number(d.elevation[0]) : Number(d?.elevation)),
      },
      {
        name: "OpenTopoData",
        url: `https://api.opentopodata.org/v1/aster30m?locations=${latArg},${lonArg}`,
        parse: (d) => Number(d?.results?.[0]?.elevation),
      },
    ]
    for (const p of providers) {
      try {
        const res = await fetch(p.url, { headers: { Accept: "application/json" } })
        if (!res.ok) continue
        const data = await res.json()
        const value = p.parse(data)
        if (Number.isFinite(value)) {
          setElev(Math.round(value))
          setStatus((s) => `${s.startsWith("Τοποθεσία OK") ? s : "Τοποθεσία OK."} Υψόμετρο εδάφους ${Math.round(value)} m (${p.name}).`)
          setStatusTone("phosphor")
          return
        }
      } catch {
        // Δοκίμασε τον επόμενο provider.
      }
    }
    setStatus((s) => `${s} Το υψόμετρο εδάφους δεν ήταν διαθέσιμο — δώσε το χειροκίνητα.`)
    setStatusTone("brass")
  }

  async function fetchLiveB(latArg: number = lat, lonArg: number = lon) {
    if (!Number.isFinite(latArg) || !Number.isFinite(lonArg)) {
      setStatus("Χρειάζονται έγκυρες συντεταγμένες.")
      setStatusTone("brass")
      return
    }
    if (latArg < -90 || latArg > 90 || lonArg < -180 || lonArg > 180) {
      setStatus("Συντεταγμένες εκτός ορίων (lat ±90°, lon ±180°).")
      setStatusTone("brass")
      return
    }
    setBusy(true)
    setStatus("Επικοινωνία με NOAA WMM…")
    setStatusTone("muted")
    try {
      // Στατικό site (GitHub Pages): κλήση απευθείας από τον browser προς το NOAA WMM.
      // Αν αποτύχει (CORS/δίκτυο), γίνεται graceful fallback στο offline dipole.
      const query = new URLSearchParams({
        lat1: String(latArg),
        lon1: String(lonArg),
        h1: String(Math.max(0, Number.isFinite(elev) ? elev : 0) / 1000),
        startYear: (date || new Date().toISOString().slice(0, 10)).slice(0, 4),
        model: "WMM",
        key: "EAU2y",
        resultFormat: "json",
        magneticComponent: "d,i,f,h,x,y,z",
      })
      const response = await fetch(
        `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm?${query}`,
        { headers: { Accept: "application/json" } },
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || `NOAA returned ${response.status}`)
      const result = payload?.result?.[0] ?? payload?.results?.[0] ?? payload?.[0] ?? payload
      const value = (...keys: string[]) => keys.map((key) => Number(result?.[key] ?? result?.[key.toUpperCase()])).find(Number.isFinite)
      const totalNt = value("totalintensity", "f")
      const declination = value("declination", "d")
      const inclination = value("inclination", "i")
      const horizontalNt = value("horintensity", "horizontalintensity", "h")
      const northNt = value("xcomponent", "northintensity", "x")
      const eastNt = value("ycomponent", "eastintensity", "y")
      const verticalNt = value("zcomponent", "verticalintensity", "z")
      const uncertaintyNt = value("totalintensity_uncertainty", "f_uncertainty", "f_unc")
      const dAnnual = value("declination_sv", "d_dot", "ddot")
      const iAnnual = value("inclination_sv", "i_dot", "idot")
      const fAnnual = value("totalintensity_sv", "f_dot", "fdot")
      if (![totalNt, declination, inclination, horizontalNt, northNt, eastNt, verticalNt].every(Number.isFinite)) throw new Error("Μη αναγνωρίσιμη απάντηση NOAA")
      // NOAA επιστρέφει εντάσεις σε nT· η εφαρμογή χρησιμοποιεί μT.
      onBResult((totalNt as number) / 1000, "NOAA WMM-2025")
      onGeomag({
        D: declination as number, I: inclination as number, F: (totalNt as number) / 1000,
        H: (horizontalNt as number) / 1000, X: (northNt as number) / 1000,
        Y: (eastNt as number) / 1000, Z: (verticalNt as number) / 1000,
        uncertainty: Number.isFinite(uncertaintyNt) ? (uncertaintyNt as number) / 1000 : null,
        secularVariation: { D: Number.isFinite(dAnnual) ? (dAnnual as number) : null, I: Number.isFinite(iAnnual) ? (iAnnual as number) : null, F: Number.isFinite(fAnnual) ? (fAnnual as number) / 1000 : null },
        source: "NOAA WMM-2025",
      })
      setStatus("Live δεδομένα NOAA WMM φορτώθηκαν.")
      setStatusTone("phosphor")
    } catch (error) {
      setStatus(`NOAA μη διαθέσιμο: ${error instanceof Error ? error.message : "άγνωστο σφάλμα"}. Χρησιμοποιείται dipole.`)
      setStatusTone("brass")
      useDipoleFallback(latArg, lonArg)
    } finally {
      setBusy(false)
    }
  }

  function useDipoleFallback(latArg: number = lat, lonArg: number = lon) {
    if (!isFinite(latArg) || !isFinite(lonArg)) {
      setStatus("Χρειάζονται έγκυρες συντεταγμένες.")
      setStatusTone("brass")
      return
    }
    const uT = computeDipoleField(latArg, lonArg)
    onBResult(uT, "Offline dipole (~10-20% σφάλμα)")
    onGeomag({
      D: 4.2, I: computeDipoleInclination(latArg, lonArg), F: uT, H: uT * 0.83, X: uT * 0.82, Y: uT * 0.07, Z: uT * 0.56,
      uncertainty: null, secularVariation: { D: null, I: null, F: null }, source: "Offline dipole (D=default, I≈dipole)",
    })
    setStatus("Εκτίμηση από offline dipole — λιγότερο ακριβ��ς από WMM.")
    setStatusTone("brass")
  }

  return (
    <Panel
      step="1"
      title="Γεωμαγνητικό Πεδίο (NOAA WMM)"
      desc="Επίλεξε σημείο στον χάρτη ή δώσε συντεταγμένες και πάτησε «Λήψη B από NOAA WMM» για πραγματικές τιμές πεδίου, απόκλισης και κλίσης. Το offline dipole παραμένει διαθέσιμο ως fallback."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Γεωγρ. πλάτος (°)" htmlFor="lat">
              <input
                id="lat"
                type="number"
                step="0.000001"
                className={inputClass}
                value={Number.isFinite(lat) ? lat : ""}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value)
                  setLat(v)
                  setGeneratorLat(v)
                  if (Number.isFinite(v) && Number.isFinite(lon)) void fetchLiveB(v, lon)
                }}
              />
            </Field>
            <Field label="Γεωγρ. μήκος (°)" htmlFor="lon">
              <input
                id="lon"
                type="number"
                step="0.000001"
                className={inputClass}
                value={Number.isFinite(lon) ? lon : ""}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value)
                  setLon(v)
                  setGeneratorLon(v)
                  if (Number.isFinite(lat) && Number.isFinite(v)) void fetchLiveB(lat, v)
                }}
              />
            </Field>
            <Field label="Υψόμετρο (m)" htmlFor="elev">
              <input
                id="elev"
                type="number"
                className={inputClass}
                value={Number.isFinite(elev) ? elev : ""}
                onChange={(e) => setElev(Number.parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Ημερομηνία" htmlFor="wmm-date">
              <input
                id="wmm-date"
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              className={buttonClass + " flex items-center gap-2"}
              onClick={useCurrentLocation}
              disabled={gpsBusy}
            >
              <Crosshair className={"size-4" + (gpsBusy ? " animate-pulse" : "")} />
              {gpsBusy ? "Εντοπισμός GPS…" : "Χρήση τρέχουσας τοποθεσίας"}
              {gpsAccuracy != null && !gpsBusy && (
                <span className="ml-auto font-mono text-[0.66rem] text-phosphor">±{gpsAccuracy} m</span>
              )}
            </button>
            <button
              type="button"
              className={buttonClass + " flex items-center gap-2"}
              onClick={() => fetchLiveB()}
              disabled={busy}
            >
              <Radio className="size-4" /> {busy ? "Λήψη από NOAA…" : "Λήψη B από NOAA WMM"}
            </button>
            <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={() => useDipoleFallback()}>
              <Calculator className="size-4" /> Offline εκτίμηση (dipole)
            </button>
          </div>
        </div>

        <div className="order-1 flex flex-col gap-3 lg:order-2">
          <div className="h-64 overflow-hidden rounded-sm border border-panel-line">
            <MapPicker
              generator={{ lat: generatorLat, lon: generatorLon }}
              target={{ lat: observedLat, lon: observedLon }}
              onPick={(mode, la, lo) => {
                if (mode === "generator") {
                  setGeneratorLat(la)
                  setGeneratorLon(lo)
                  // Η γεννήτρια ορίζει και το σημείο μέτρησης του γεωμαγνητικού πεδίου.
                  setLat(la)
                  setLon(lo)
                  void fetchLiveB(la, lo)
                } else {
                  setObservedLat(la)
                  setObservedLon(lo)
                }
              }}
            />
          </div>
          <p className="flex items-center gap-1.5 font-mono text-[0.68rem] text-muted-foreground">
            <MapPin className="size-3 text-brass" /> Κάνε κλικ στον χάρτη για επιλογή σημείου
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Readout label="Ολικό πεδίο F (WMM)" value={Number.isFinite(bfield) ? bfield.toFixed(4) : "—"} unit="µT" />
        <Readout label="Πηγή" value={bSource} tone="brass" />
        <Readout label="Κατάσταση" value={status} tone={statusTone} className="sm:col-span-1" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Readout label="H οριζόντιο" value={geomag.H.toFixed(3)} unit="µT" tone="muted" />
        <Readout label="X βόρεια" value={geomag.X.toFixed(3)} unit="µT" tone="muted" />
        <Readout label="Y ανατολικά" value={geomag.Y.toFixed(3)} unit="µT" tone="muted" />
        <Readout label="Z κατακόρυφο" value={geomag.Z.toFixed(3)} unit="µT" tone="muted" />
      </div>
      <p className="mt-3 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">
        Απόκλιση D = {geomag.D.toFixed(2)}° · Κλίση I = {geomag.I.toFixed(2)}° · Αβεβαιότ��τα F = {geomag.uncertainty == null ? "—" : `±${geomag.uncertainty.toFixed(3)} µT`} · Secular variation: D {geomag.secularVariation.D == null ? "—" : `${geomag.secularVariation.D.toFixed(2)}���/yr`}, I {geomag.secularVariation.I == null ? "—" : `${geomag.secularVariation.I.toFixed(2)}′/yr`}, F {geomag.secularVariation.F == null ? "—" : `${geomag.secularVariation.F.toFixed(3)} µT/yr`}.
      </p>
    </Panel>
  )
}
