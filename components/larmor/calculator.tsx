"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  MATERIALS,
  SOIL_TYPES,
  REFRACTION_SOILS,
  PRESETS,
  getPreset,
  BANDS,
  getMaterial,
  getUnitRef,
  effectiveRadiusMm,
  larmorHz,
  skinDepth,
  findNearestHarmonic,
  findOptimalCombo,
  fmtFrequency,
  fmtHzOnly,
  fmtLength,
  fmtDelta,
  fmtBandFrequency,
  computeComplexN,
  computeGprPropagation,
  computeSnell,
  metalSkinResponse,
  effectiveReflectionDepthM,
  computeDriftDirection,
  distanceAndBearingKm,
  computeDipoleField,
  computeDipoleInclination,
  computeMeasurementQuality,
  validateLat,
  validateLon,
  validateBField,
  validateDepth,
  validateSigma,
  type DipoleAxis,
} from "@/lib/physics"
import { Crosshair } from "lucide-react"
import { Panel, Field, Readout, inputClass, selectClass, buttonClass } from "./primitives"
import { Spectrum } from "./spectrum"
import { SkinDepthChart } from "./skin-depth-chart"
import { Compass, RayDiagram } from "./drift-visuals"
import { LocationPanel, type GeomagResult } from "./location-panel"
import { HistoryPanel, type Measurement } from "./history-panel"
import { ExportButtons } from "./export-buttons"
import { TriangulationPanel } from "./triangulation-panel"

export function Calculator() {
  // Location / field
  const [lat, setLat] = useState(37.9838)
  const [lon, setLon] = useState(23.7275)
  const [elev, setElev] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [bfield, setBfield] = useState(47)
  const [bSource, setBSource] = useState("χειροκίνητο")
  const [geomag, setGeomag] = useState<GeomagResult>({ D: 4.2, I: 57, F: 47, H: 39, X: 38, Y: 3, Z: 37, uncertainty: null, secularVariation: { D: null, I: null, F: null }, source: "default (Ελλάδα ~2024)" })

  // Material / harmonics
  const [materialId, setMaterialId] = useState("au197")
  const [maxharm, setMaxharm] = useState(8)
  const [selectedN, setSelectedN] = useState(1)
  const [unitMultiplier, setUnitMultiplier] = useState(1)

  // Soil skin depth (section 3) — το «Εκτιμώμενο βάθος στόχου» είναι ΜΙΑ κοινή τιμή
  // που τροφοδοτεί όλα τα sections που χρειάζονται βάθος (3 και 6).
  const [soilType, setSoilType] = useState("0.01")
  const [sigmaCustom, setSigmaCustom] = useState(0.001)
  const [targetDepth, setTargetDepth] = useState(1)

  // Refraction (section 6) — το βάθος d δεν είναι πλέον ξεχωριστό state·
  // χρησιμοποιεί το κοινό targetDepth ώστε να μη δίνεται δύο φορές.
  const [sec6Soil, setSec6Soil] = useState("10|0.01")
  const [sec6Theta, setSec6Theta] = useState(15)
  const [sec6H, setSec6H] = useState(1.0)
  const [dipoleAxis, setDipoleAxis] = useState<DipoleAxis>("NS")

  // Experimental field setup and observed endpoint
  const [generatorLat, setGeneratorLat] = useState(37.9838)
  const [generatorLon, setGeneratorLon] = useState(23.7275)
  const [generatorFrequency, setGeneratorFrequency] = useState(0)
  const [generatorBandLabel, setGeneratorBandLabel] = useState("")
  const [rodLengthCm] = useState(15)
  const [rodSpacingCm] = useState(10)
  const [observedLat, setObservedLat] = useState(37.9845)
  const [observedLon, setObservedLon] = useState(23.735)

  // Preset & GPS UI feedback
  const [activePreset, setActivePreset] = useState<string>("")
  const [gpsStatus, setGpsStatus] = useState<string>("")

  // ── Persistence: επαναφορά/αποθήκευση της τρέχουσας συνεδρίας σε localStorage ──
  // Ώστε το σύνολο των ρυθμίσεων εργασίας (υλικό, πεδίο, συντεταγμένες, έδαφος,
  // διάθλαση κ.λπ.) να επιβιώνει ανάμεσα σε sessions, όχι μόνο το ιστορικό.
  const STATE_KEY = "larmor-session-v1"
  const restoredRef = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (Number.isFinite(s.lat)) setLat(s.lat)
        if (Number.isFinite(s.lon)) setLon(s.lon)
        if (Number.isFinite(s.elev)) setElev(s.elev)
        if (typeof s.date === "string") setDate(s.date)
        if (Number.isFinite(s.bfield)) setBfield(s.bfield)
        if (typeof s.bSource === "string") setBSource(s.bSource)
        if (s.geomag && typeof s.geomag === "object") setGeomag(s.geomag)
        if (typeof s.materialId === "string") setMaterialId(s.materialId)
        if (Number.isFinite(s.maxharm)) setMaxharm(s.maxharm)
        if (Number.isFinite(s.selectedN)) setSelectedN(s.selectedN)
        if (Number.isFinite(s.unitMultiplier)) setUnitMultiplier(s.unitMultiplier)
        if (typeof s.soilType === "string") setSoilType(s.soilType)
        if (Number.isFinite(s.sigmaCustom)) setSigmaCustom(s.sigmaCustom)
        if (Number.isFinite(s.targetDepth)) setTargetDepth(s.targetDepth)
        else if (Number.isFinite(s.sec6Depth)) setTargetDepth(s.sec6Depth)
        if (typeof s.sec6Soil === "string") setSec6Soil(s.sec6Soil)
        if (Number.isFinite(s.sec6Theta)) setSec6Theta(s.sec6Theta)
        if (Number.isFinite(s.sec6H)) setSec6H(s.sec6H)
        if (s.dipoleAxis === "NS" || s.dipoleAxis === "EW") setDipoleAxis(s.dipoleAxis)
        if (Number.isFinite(s.generatorLat)) setGeneratorLat(s.generatorLat)
        if (Number.isFinite(s.generatorLon)) setGeneratorLon(s.generatorLon)
        if (Number.isFinite(s.generatorFrequency)) setGeneratorFrequency(s.generatorFrequency)
        if (typeof s.generatorBandLabel === "string") setGeneratorBandLabel(s.generatorBandLabel)
        if (Number.isFinite(s.observedLat)) setObservedLat(s.observedLat)
        if (Number.isFinite(s.observedLon)) setObservedLon(s.observedLon)
        if (typeof s.activePreset === "string") setActivePreset(s.activePreset)
      }
    } catch (e) {
      console.warn("[v0] Session restore failed:", e)
    }
    restoredRef.current = true
  }, [])

  useEffect(() => {
    if (!restoredRef.current) return
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          lat, lon, elev, date, bfield, bSource, geomag,
          materialId, maxharm, selectedN, unitMultiplier,
          soilType, sigmaCustom, targetDepth,
          sec6Soil, sec6Theta, sec6H, dipoleAxis,
          generatorLat, generatorLon, generatorFrequency, generatorBandLabel,
          observedLat, observedLon, activePreset,
        }),
      )
    } catch (e) {
      console.warn("[v0] Session save failed:", e)
    }
  }, [
    lat, lon, elev, date, bfield, bSource, geomag,
    materialId, maxharm, selectedN, unitMultiplier,
    soilType, sigmaCustom, targetDepth,
    sec6Soil, sec6Theta, sec6H, dipoleAxis,
    generatorLat, generatorLon, generatorFrequency, generatorBandLabel,
    observedLat, observedLon, activePreset,
  ])

  // Εφαρμογή γρήγορης προεπιλογής υλικού + εδάφους (skin depth & διάθλαση).
  function applyPreset(id: string) {
    const p = getPreset(id)
    if (!p) return
    setMaterialId(p.materialId)
    setSoilType(p.soilType)
    setSec6Soil(p.sec6Soil)
    setActivePreset(id)
  }

  // Ένα-πάτημα GPS για το παρατηρούμενο (τελικό) σημείο — γεμίζει lat/lon αυτόματα.
  function useCurrentTargetLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("Το GPS δεν υποστηρίζεται σε αυτή τη συσκευή.")
      return
    }
    setGpsStatus("Αναμονή άδειας τοποθεσίας…")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(6))
        const lo = Number(pos.coords.longitude.toFixed(6))
        setObservedLat(la)
        setObservedLon(lo)
        const acc = pos.coords.accuracy
        setGpsStatus(`Τελική θέση OK${Number.isFinite(acc) ? ` (±${Math.round(acc)} m)` : ""}.`)
      },
      (err) => setGpsStatus("Σφάλμα GPS: " + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const mat = getMaterial(materialId)
  const sigmaSoil = soilType === "custom" ? sigmaCustom : Number.parseFloat(soilType)
  const f0 = useMemo(() => larmorHz(mat.gamma, bfield), [mat.gamma, bfield])
  const rMm = useMemo(() => effectiveRadiusMm(mat, unitMultiplier), [mat, unitMultiplier])

  const f0fmt = fmtFrequency(f0)

  // Harmonics rows
  const harmonics = useMemo(() => {
    const rows = []
    for (let i = 1; i <= maxharm; i++) {
      const f = f0 * i
      rows.push({
        n: i,
        f,
        dSoil: skinDepth(f, sigmaSoil),
        dMetal: skinDepth(f, mat.sigma, mat.muR),
      })
    }
    return rows
  }, [f0, maxharm, sigmaSoil, mat])

  // Bands
  const bands = useMemo(() => {
    if (f0 <= 0) return []
    return BANDS.map((band) => {
      const result =
        band.criterion === "optimal"
          ? findOptimalCombo(f0, sigmaSoil, mat, rMm)
          : findNearestHarmonic(f0, band.target as number, band.criterion)
      if (!result) return null
      const f = result.f
      return {
        label: band.label,
        criterion: band.criterion,
        n: result.n,
        f,
        deltaF: band.target ? f - band.target : null,
        dSoil: skinDepth(f, sigmaSoil),
        dMetal: skinDepth(f, mat.sigma, mat.muR),
      }
    }).filter(Boolean) as {
      label: string
      criterion: any
      n: number
      f: number
      deltaF: number | null
      dSoil: number
      dMetal: number
    }[]
  }, [f0, sigmaSoil, mat, rMm])

  // ── Επιλεγμένη συχνότητα εκπομπής (από τις ομαδοποιημένες ζώνες, section 2β) ──
  // Αυτή είναι η ΜΙΑ συχνότητα που τροφοδοτεί όλους τους παρακάτω υπολογισμούς:
  // skin depth εδάφους (3), skin depth μετάλλου (4), διάθλαση/drift (6) και
  // τελική χαρτογράφηση (7). Ο χρήστης επιλέγει ζώνη ή δίνει χειροκίνητη τιμή.
  const selectedBand = useMemo(() => {
    if (!bands.length) return null
    return (
      bands.find((b) => b.label === generatorBandLabel) ??
      bands.find((b) => b.criterion === "optimal") ??
      bands[0]
    )
  }, [bands, generatorBandLabel])
  const autoGeneratorFrequency = selectedBand ? selectedBand.f : f0
  const effectiveGeneratorFrequency = generatorFrequency > 0 ? generatorFrequency : autoGeneratorFrequency
  const generatorFrequencyIsAuto = !(generatorFrequency > 0)
  const genRowLabel = generatorFrequencyIsAuto ? (selectedBand?.label ?? "—") : "χειροκίνητο"

  // Η κύρια συχνότητα όλων των υπολογισμών = η συχνότητα εκπομπής της γεννήτριας
  const fSelected = effectiveGeneratorFrequency
  const fSelFmt = fmtFrequency(fSelected)

  // Section 3 — skin depth εδάφους στη συχνότητα εκπομπής
  const deltaSoil = skinDepth(fSelected, sigmaSoil)
  const depthRatio = isFinite(deltaSoil) && deltaSoil > 0 ? targetDepth / deltaSoil : 0
  const attenPct = isFinite(deltaSoil) ? Math.max(0, Math.min(100, Math.exp(-depthRatio) * 100)) : 0

  // Section 4 — skin depth υλικού-στόχου στη συχνότητα εκπομπής
  const deltaMetal = skinDepth(fSelected, mat.sigma, mat.muR)
  const tMetal = rMm / 1000
  const metalRatio = isFinite(deltaMetal) && deltaMetal > 0 && tMetal > 0 ? tMetal / deltaMetal : 0
  const ref = getUnitRef(mat)
  const totalVol = unitMultiplier * ref.volume_cm3
  const totalMass = unitMultiplier * ref.mass_g

  // Chart data
  const chartData = harmonics.map((h) => ({ n: h.n, soil: h.dSoil, metal: h.dMetal }))

  // Section 6 refraction — η κύρια γραμμή υπολογίζεται στη συχνότητα εκπομπής (fSelected).
  // Ο πίνακας δείχνει και τις υπόλοιπες ομαδοποιημένες ζώνες για σύγκριση.
  const refraction = useMemo(() => {
    const [epsStr, sigStr] = sec6Soil.split("|")
    const epsilon_r = Number.parseFloat(epsStr)
    const sigma = Number.parseFloat(sigStr)
    const theta1_rad = (sec6Theta * Math.PI) / 180

    const computeRow = (label: string, f: number) => {
      if (!f || f <= 0) return null
      const { n_r, loss_tangent, skin_depth_m } = computeComplexN(epsilon_r, sigma, f)
      const { theta2_deg, is_TIR, theta_c_deg } = computeSnell(n_r, sec6Theta)
      // Halo shell: ισχυρός ανακλαστήρας → ανάκλαση σε φλούδα μία ακτίνα πιο ρηχά.
      const deltaMetalRow = skinDepth(f, mat.sigma, mat.muR)
      const metalResp = metalSkinResponse(rMm, deltaMetalRow)
      const { depth: d_eff, shift: halo_shift } = effectiveReflectionDepthM(targetDepth, rMm, metalResp)
      const x_exit = d_eff * Math.tan(theta1_rad)
      const x_total = is_TIR ? x_exit : x_exit + sec6H * Math.tan(((theta2_deg as number) * Math.PI) / 180)
      const v_soil = 3e8 / n_r
      const lambda = v_soil / f
      const r_fresnel = Math.sqrt(lambda * d_eff)
      const propagation = computeGprPropagation(epsilon_r, sigma, f, Math.hypot(d_eff, x_total))
      const atten_db = propagation.attenuationDb
      return { label, n_r, loss_tangent, theta2_deg, is_TIR, theta_c_deg, x_exit, x_total, r_fresnel, atten_db, f, skin_depth_m, propagation, d_eff, halo_shift, metalResp }
    }

    const rows = bands.map((b) => computeRow(b.label, b.f)).filter(Boolean) as any[]
    const mainRow = computeRow(genRowLabel, fSelected)
    const selectedLabel = generatorFrequencyIsAuto ? (selectedBand?.label ?? null) : null
    return { rows, mainRow, selectedLabel, epsilon_r, sigma }
  }, [sec6Soil, sec6Theta, targetDepth, sec6H, bands, fSelected, genRowLabel, generatorFrequencyIsAuto, selectedBand, mat, rMm])

  const drift = useMemo(
    () => computeDriftDirection(dipoleAxis, geomag.D),
    [dipoleAxis, geomag.D],
  )

  const endpoint = useMemo(() => distanceAndBearingKm(generatorLat, generatorLon, observedLat, observedLon), [generatorLat, generatorLon, observedLat, observedLon])

  // ── Δείκτες ποιότητας μέτρησης (αντικαθιστούν το παλιό ευριστικό confidence) ──
  // Σύνθετος, διαφανής δείκτης από φυσικά θεμελιωμένους παράγοντες: πηγή πεδίου B,
  // εγκυρότητα μοντέλου διάθλασης (tan δ), γεωμετρία (ΟΕΑ), ισχύ σήματος στο βάθος,
  // εγγύτητα σημείων και επιλογή βέλτιστης συχνότητας.
  const quality = useMemo(
    () =>
      computeMeasurementQuality({
        bSource,
        lossTangent: refraction.mainRow?.loss_tangent ?? null,
        isTIR: refraction.mainRow?.is_TIR ?? false,
        distanceKm: endpoint.distanceKm,
        signalAmplitudePct: attenPct,
        frequencyIsOptimal: generatorFrequencyIsAuto && selectedBand?.criterion === "optimal",
      }),
    [bSource, refraction.mainRow, endpoint.distanceKm, attenPct, generatorFrequencyIsAuto, selectedBand],
  )

  const estimatedTarget = useMemo(
    () => ({
      lat: observedLat,
      lon: observedLon,
      confidence: quality.score,
    }),
    [observedLat, observedLon, quality.score],
  )

  function handleBResult(uT: number, source: string) {
    setBfield(Number(uT.toFixed(4)))
    setBSource(source)
  }

  // Κεντρικός υπολογισμός γεωμαγνητικού πεδίου για ένα σημείο — ώστε κάθε αλλαγή
  // συντεταγμένων (χάρτης, τρέχουσα θέση, χειροκίνητ�� πληκτρολόγη��η) να ενημερώνει το B.
  function computeFieldAt(la: number, lo: number) {
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return
    const uT = computeDipoleField(la, lo)
    handleBResult(uT, "Offline dipole (~10-20% σφάλμα)")
    setGeomag({ D: 4.2, I: computeDipoleInclination(la, lo), F: uT, H: uT * 0.83, X: uT * 0.82, Y: uT * 0.07, Z: uT * 0.56, uncertainty: null, secularVariation: { D: null, I: null, F: null }, source: "Offline dipole (D=default, I≈dipole)" })
  }

  // Η γεννήτρια και το σημείο μέτρησης ταυτίζονται: όποιο και να αλλάξει, συγχρονίζονται
  // και τα δύο ζεύγη συν��εταγμένων, ο χάρτης κεντράρεται και το πεδίο B επανυπολογίζεται.
  function applyGeneratorLat(v: number) {
    setGeneratorLat(v)
    setLat(v)
    computeFieldAt(v, generatorLon)
  }
  function applyGeneratorLon(v: number) {
    setGeneratorLon(v)
    setLon(v)
    computeFieldAt(generatorLat, v)
  }

  function captureMeasurement(): Measurement {
    return {
      id: "meas_" + Date.now(),
      timestamp: new Date().toISOString(),
      material_id: mat.id,
      material_name: mat.name,
      B_uT: bfield,
      f0_hz: f0,
      unit_mult: unitMultiplier,
      equiv_radius_mm: rMm,
      selected_n: selectedBand?.n ?? selectedN,
      selected_freq_hz: fSelected,
      soil_type: sec6Soil,
      theta1_deg: sec6Theta,
      h_m: sec6H,
      depth_m: targetDepth,
      drift_x_total_m: refraction.mainRow?.x_total ?? 0,
      drift_axis: drift.axis_label,
      drift_dir1: drift.dir1_label,
      drift_dir2: drift.dir2_label,
      dipole_axis: dipoleAxis,
      lat,
      lon,
      generator_lat: generatorLat,
      generator_lon: generatorLon,
      generator_freq_hz: effectiveGeneratorFrequency,
      generator_band: genRowLabel,
      target_lat: observedLat,
      target_lon: observedLon,
      target_bearing_deg: endpoint.bearingDeg,
      target_distance_km: endpoint.distanceKm,
      target_confidence: estimatedTarget.confidence,
      notes: "",
    }
  }

  const exportState = {
    mat,
    f0,
    bfield,
    bSource,
    lat,
    lon,
    elev,
    date,
    maxharm,
    sigmaSoil,
    selectedN,
    fSelected,
    deltaSoil,
    deltaMetal,
    targetDepth,
    rMm,
    generatorLat,
    generatorLon,
    generatorFrequency: effectiveGeneratorFrequency,
    rodLengthCm,
    rodSpacingCm,
    observedLat,
    observedLon,
    estimateDistanceKm: endpoint.distanceKm,
    estimateBearingDeg: endpoint.bearingDeg,
    estimateConfidence: estimatedTarget.confidence,
  }

  return (
    <div className="flex flex-col gap-5">
      <LocationPanel
        lat={lat}
        lon={lon}
        elev={elev}
        date={date}
        bfield={bfield}
        bSource={bSource}
        geomag={geomag}
        setLat={setLat}
        setLon={setLon}
        setElev={setElev}
        setDate={setDate}
        onBResult={handleBResult}
        onGeomag={setGeomag}
        generatorLat={generatorLat}
        generatorLon={generatorLon}
        observedLat={observedLat}
        observedLon={observedLon}
        setGeneratorLat={setGeneratorLat}
        setGeneratorLon={setGeneratorLon}
        setObservedLat={setObservedLat}
        setObservedLon={setObservedLon}
      />

      <Panel step="7" className="order-last" title="Τελική χαρτογράφηση & πειραματική εκτίμηση θέσης" desc="Αφού επιλέξεις υλικό, πεδίο και συχνότητα, κατέγραψε τη γεννήτρια και το σημείο που δείχνουν οι βέργες. Η απόσταση και η διόπτευση είναι πειραματικές εκτιμήσεις.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Γεννήτρια · πλάτος" htmlFor="generator-lat" warn={validateLat(generatorLat)}><input id="generator-lat" type="number" step="0.000001" min={-90} max={90} className={inputClass} value={generatorLat} onChange={(e) => applyGeneratorLat(Number.parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Γεννήτρια · μήκος" htmlFor="generator-lon" warn={validateLon(generatorLon)}><input id="generator-lon" type="number" step="0.000001" min={-180} max={180} className={inputClass} value={generatorLon} onChange={(e) => applyGeneratorLon(Number.parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Συχνότητα πομπού · από ζώνη" htmlFor="generator-band">
              <select
                id="generator-band"
                className={selectClass}
                value={selectedBand?.label ?? ""}
                onChange={(e) => setGeneratorBandLabel(e.target.value)}
                disabled={!generatorFrequencyIsAuto}
              >
                {bands.map((b) => (
                  <option key={b.label} value={b.label}>
                    {b.label} · n={b.n} · {fmtBandFrequency(b.f, b.criterion)}
                  </option>
                ))}
              </select>
              <input
                id="generator-frequency"
                type="number"
                min="0"
                className={inputClass + " mt-2"}
                value={generatorFrequency || ""}
                onChange={(e) => setGeneratorFrequency(Number.parseFloat(e.target.value) || 0)}
                placeholder={`από ζώνη = ${fmtHzOnly(autoGeneratorFrequency)}`}
              />
              <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[0.6rem] text-muted-foreground">
                <span className={generatorFrequencyIsAuto ? "text-phosphor" : "text-foreground"}>
                  {generatorFrequencyIsAuto
                    ? `ζώνη «${selectedBand?.label ?? "—"}» → ${fmtHzOnly(effectiveGeneratorFrequency)}`
                    : `χειροκίνητο → ${fmtHzOnly(effectiveGeneratorFrequency)}`}
                </span>
                {!generatorFrequencyIsAuto && (
                  <button type="button" onClick={() => setGeneratorFrequency(0)} className="rounded-sm border border-panel-line px-1.5 py-0.5 uppercase tracking-wide text-brass hover:bg-secondary/30">Χρήση ζώνης</button>
                )}
              </span>
            </Field>
            <div className="rounded-sm border border-panel-line bg-readout p-3 font-mono text-xs text-muted-foreground"><span className="block text-[10px] uppercase tracking-wider text-brass">Ηλεκτρόδια</span><span className="text-foreground">Μπρούτζος · 15 cm</span><br /><span className="text-foreground">Απόσταση: {rodSpacingCm} cm</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <button type="button" className={buttonClass + " flex w-full items-center justify-center gap-2"} onClick={useCurrentTargetLocation}>
                <Crosshair className="size-4" /> Χρήση τρέχουσας θέσης (τελικό σημείο)
              </button>
              {gpsStatus && <p className="mt-1.5 font-mono text-[0.68rem] text-muted-foreground">{gpsStatus}</p>}
            </div>
            <Field label="Τελική θέση · πλάτος" htmlFor="observed-lat" warn={validateLat(observedLat)}><input id="observed-lat" type="number" step="0.000001" min={-90} max={90} className={inputClass} value={observedLat} onChange={(e) => setObservedLat(Number.parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Τελική θέση · μήκος" htmlFor="observed-lon" warn={validateLon(observedLon)}><input id="observed-lon" type="number" step="0.000001" min={-180} max={180} className={inputClass} value={observedLon} onChange={(e) => setObservedLon(Number.parseFloat(e.target.value) || 0)} /></Field>
            <Readout label="Απόσταση σημείων" value={endpoint.distanceKm.toFixed(3)} unit="km" tone="phosphor" />
            <Readout label="Διόπτευση" value={endpoint.bearingDeg.toFixed(1)} unit="°" tone="brass" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Readout label="Εκτιμώμενος στόχος" value={`${estimatedTarget.lat.toFixed(6)}, ${estimatedTarget.lon.toFixed(6)}`} tone="phosphor" />
          <Readout label={`Ποιότητα μέτρησης · ${quality.grade}`} value={quality.score.toFixed(0)} unit="/100" tone={quality.gradeStatus === "good" ? "phosphor" : "brass"} />
          <Readout label="Μήκος ηλεκτροδίων" value={rodLengthCm.toFixed(0)} unit="cm" />
        </div>

        {/* Ανάλυση δεικτών ποιότητας — διαφανής, αντί ενός αδιαφανούς ποσοστού */}
        <div className="mt-4 rounded-sm border border-panel-line bg-readout p-3.5">
          <p className="mb-3 flex items-center justify-between gap-2 font-mono text-[0.72rem]">
            <span className="uppercase tracking-wide text-muted-foreground">Δείκτες ποιότητας μέτρησης</span>
            <span
              className={
                "rounded-sm border px-2 py-0.5 " +
                (quality.gradeStatus === "good"
                  ? "border-phosphor-dim text-phosphor"
                  : quality.gradeStatus === "warn"
                    ? "border-brass-dim text-brass"
                    : "border-destructive text-destructive")
              }
            >
              {quality.grade} · {quality.score.toFixed(0)}/100
            </span>
          </p>
          <div className="flex flex-col gap-2.5">
            {quality.factors.map((f) => {
              const barColor =
                f.status === "good" ? "bg-phosphor" : f.status === "warn" ? "bg-brass" : "bg-destructive"
              const textColor =
                f.status === "good" ? "text-phosphor" : f.status === "warn" ? "text-brass" : "text-destructive"
              return (
                <div key={f.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[0.72rem] text-foreground">{f.label}</span>
                  <span className={"font-mono text-[0.72rem] " + textColor}>{Math.round(f.score * 100)}%</span>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full border border-panel-line bg-panel">
                    <div className={"h-full transition-all " + barColor} style={{ width: `${f.score * 100}%` }} />
                  </div>
                  <span className="col-span-2 font-mono text-[0.66rem] leading-snug text-muted-foreground">{f.detail}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 border-t border-panel-line pt-2.5 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
            Ο δείκτης είναι σταθμισμένος συνδυασμός σαφών παραγόντων ποιότητας (πηγή πεδίου, εγκυρότητα μοντέλου
            διάθλασης, γεωμετρία διάδοσης, ισχύς σήματος, εγγύτητα σημείων, επιλογή συχνότητας) — όχι αυθαίρετο ποσοστό.
          </p>
        </div>
      </Panel>

      <TriangulationPanel
        currentGenerator={{ lat: generatorLat, lon: generatorLon }}
        currentBearing={endpoint.bearingDeg}
      />

      {/* Section 1 result — Larmor */}
      <Panel
        id="section-larmor"
        step="1"
        title="Αποτέλεσμα · Συχνότητα Larmor"
        desc="Επίλεξε υλικό-στόχο και ένταση γήινου μαγνητικού πεδίου (τυπικές τιμές: 25–65 µT). Για διαμάντι, άζωτο και νιτρικό βάριο χρησιμοποιούνται οι πυρήνες ¹²C/¹⁴N και προσεγγιστικές ηλεκτρικές παράμετροι."
      >
        <div className="mb-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Γρήγορες προεπιλογές (υλικό + έδαφος)</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.desc}
                onClick={() => applyPreset(p.id)}
                className={
                  "rounded-sm border px-2.5 py-1.5 font-mono text-[0.72rem] transition-colors " +
                  (activePreset === p.id
                    ? "border-brass bg-secondary/50 text-brass"
                    : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
                }
              >
                {activePreset === p.id ? "▸ " : ""}
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Υλικό" htmlFor="material">
            <select id="material" className={selectClass} value={materialId} onChange={(e) => { setMaterialId(e.target.value); setActivePreset("") }}>
              {MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.gamma} MHz/T
                </option>
              ))}
            </select>
          </Field>
          <Field label="Μαγνητικό πεδίο B (µT)" htmlFor="bfield" warn={validateBField(bfield)}>
            <input
              id="bfield"
              type="number"
              step="0.0001"
              min={0}
              max={100}
              className={inputClass}
              value={bfield}
              onChange={(e) => {
                setBfield(Number.parseFloat(e.target.value) || 0)
                setBSource("χειροκίνητο")
              }}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Readout label="Θεμελιώδης συχνότητα Larmor" value={f0fmt.val} unit={f0fmt.unit} />
          <Readout label="γ/2π" value={mat.gamma.toString()} unit="MHz/T" tone="brass" />
        </div>
        <p className="mt-3 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          Ακριβής τιμή (πλήρης ακρίβεια IEEE-754 double):{" "}
          <span className="text-phosphor">{f0.toString()} Hz</span>
        </p>
      </Panel>

      {/* Section 2 — Harmonics */}
      <Panel
        step="2"
        title="Αρμονικές"
        desc="Ακέ��αια πολλαπλάσια της θεμελιώδους συχνότητας. Κάνε κλικ σε γραμμή του φάσματος για επιλογή αρμονικής."
      >
        <Field label="Πλήθος εμφανιζόμενων αρμονικών (n)" htmlFor="maxharm">
          <input
            id="maxharm"
            type="number"
            min={2}
            max={16}
            className={inputClass + " sm:max-w-40"}
            value={maxharm}
            onChange={(e) => setMaxharm(Math.max(2, Math.min(16, Number.parseInt(e.target.value) || 8)))}
          />
        </Field>
        <Spectrum count={maxharm} active={selectedN} onSelect={setSelectedN} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="text-left text-[0.72rem] uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-panel-line px-2.5 py-2">n</th>
                <th className="border-b border-panel-line px-2.5 py-2">Συχνότητα (Hz)</th>
                <th className="border-b border-panel-line px-2.5 py-2">δ έδαφος · δ μέταλλο</th>
              </tr>
            </thead>
            <tbody>
              {harmonics.map((h) => (
                <tr
                  key={h.n}
                  className={
                    h.n === selectedN
                      ? "cursor-pointer bg-secondary/40"
                      : "cursor-pointer hover:bg-secondary/20"
                  }
                  onClick={() => setSelectedN(h.n)}
                >
                  <td className={"border-b border-panel-line px-2.5 py-2 " + (h.n === 1 ? "text-phosphor" : "")}>n={h.n}</td>
                  <td className={"border-b border-panel-line px-2.5 py-2 " + (h.n === 1 ? "text-phosphor" : "")}>{fmtHzOnly(h.f)}</td>
                  <td className="border-b border-panel-line px-2.5 py-2 text-muted-foreground">
                    {fmtLength(h.dSoil)} · {fmtLength(h.dMetal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 2b — Bands */}
      <Panel
        step="2β"
        title="Ομαδοποίηση Αρμονικών σε Ζώνες — Επιλογή συχνότητας εκπομπής"
        desc="Επίλεξε εδώ (κλικ σε γραμμή) ποια συχνότητα θα εκπέμπει η γεννήτρια. Όλοι οι υπολογισμοί που ακολουθούν — skin depth εδάφους & μετάλλου, διάθλαση και drift — βασίζονται σε αυτήν τη συχνότητα. Η τελευταία γραμμή είναι η αυτόματη βέλτιστη πρόταση."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-phosphor-dim/50 bg-secondary/30 px-3 py-2.5 font-mono text-[0.72rem]">
          <span className="text-muted-foreground">
            Συχνότητα εκπομπής γεννήτριας:{" "}
            <span className="text-phosphor">{fmtHzOnly(fSelected)}</span>{" "}
            <span className="text-brass">({genRowLabel})</span>
          </span>
          <span className="text-[0.68rem] text-muted-foreground">Κλικ σε ζώνη για επιλογή</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[0.78rem]">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-panel-line px-2 py-2">Ζώνη</th>
                <th className="border-b border-panel-line px-2 py-2">n</th>
                <th className="border-b border-panel-line px-2 py-2">Συχνότητα</th>
                <th className="border-b border-panel-line px-2 py-2">Δf</th>
                <th className="border-b border-panel-line px-2 py-2">δ έδαφος</th>
                <th className="border-b border-panel-line px-2 py-2">δ μέταλλο</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => {
                const isOpt = b.criterion === "optimal"
                const isSelected = generatorFrequencyIsAuto && selectedBand?.label === b.label
                return (
                  <tr
                    key={b.label}
                    onClick={() => {
                      setGeneratorBandLabel(b.label)
                      setGeneratorFrequency(0)
                    }}
                    className={
                      (isOpt ? "border-t border-brass-dim " : "") +
                      "cursor-pointer " +
                      (isSelected ? "bg-secondary/50" : "hover:bg-secondary/20")
                    }
                  >
                    <td className={"px-2 py-2 " + (isOpt ? "text-brass" : "")}>
                      {isSelected ? "▸ " : ""}
                      {b.label}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">n={b.n.toLocaleString("el-GR")}</td>
                    <td className="break-all px-2 py-2 text-phosphor">{fmtBandFrequency(b.f, b.criterion)}</td>
                    <td className="px-2 py-2 text-[0.72rem] text-muted-foreground">
                      {b.deltaF == null
                        ? "(βέλτιστο)"
                        : (b.deltaF >= 0 ? "+" : "") + b.deltaF.toLocaleString("el-GR", { maximumFractionDigits: 3 }) + " Hz"}
                    </td>
                    <td className="px-2 py-2">{fmtDelta(b.dSoil)}</td>
                    <td className="px-2 py-2">{fmtDelta(b.dMetal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-sm border border-brass-dim/50 bg-secondary/30 px-3 py-2.5 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          ★ Βέλτιστος: Μεγιστοποιεί το δ_soil × (1 − e^(−t/δ_metal)). Το βέλτιστο f βρίσκεται εκεί όπου δ_metal ≈ ισοδύναμη
          ακτίνα του στόχου. ⚠ Στα 1/3/6 GHz μόνο τα πρώτα ~5-6 δεκαδικά είναι αξιόπιστα (όριο IEEE-754).
        </p>
      </Panel>

      {/* Section 3 — Soil skin depth */}
      <Panel
        step="3"
        title="Βάθος Διείσδυσης Σήματος (Skin Depth εδάφους)"
        desc={<>Το ΕΜ σήμα εξασθενεί εκθετικά με το βάθος. Για καλό αγωγό χρησιμοποιούμε ρητά <span className="font-mono text-foreground">δ = √(2 / (ω μ σ))</span>, όπου ω = 2πf κα�� μ = μ₀μᵣ. Ισχύει κυρίως για καλούς αγωγούς και επίπεδα κύματα· για διηλεκτρικά/κοντινό πεδίο χρειάζεται πληρέστερο μοντέλο.</>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Τύπος εδάφους" htmlFor="soiltype">
            <select id="soiltype" className={selectClass} value={soilType} onChange={(e) => { setSoilType(e.target.value); setActivePreset("") }}>
              {SOIL_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
              <option value="custom">Προσαρμοσμένη τιμή…</option>
            </select>
          </Field>
          {soilType === "custom" && (
            <Field label="Αγωγιμότητα σ (S/m)" htmlFor="sigma-custom" warn={validateSigma(sigmaCustom)}>
              <input
                id="sigma-custom"
                type="number"
                step="0.0001"
                min={0}
                className={inputClass}
                value={sigmaCustom}
                onChange={(e) => setSigmaCustom(Number.parseFloat(e.target.value) || 0.001)}
              />
            </Field>
          )}
          <Field label="Εκτιμώμενο βάθος στόχου (m)" htmlFor="target-depth" warn={validateDepth(targetDepth)}>
            <input
              id="target-depth"
              type="number"
              step="0.1"
              min={0}
              className={inputClass}
              value={targetDepth}
              onChange={(e) => setTargetDepth(Number.parseFloat(e.target.value) || 0)}
            />
            <span className="mt-1 block font-mono text-[0.6rem] text-phosphor">εφαρμόζεται αυτόματα και στο §6 (διάθλαση/drift)</span>
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Readout label={`Skin depth @ ${fSelFmt.val} ${fSelFmt.unit}`} value={isFinite(deltaSoil) ? deltaSoil.toFixed(2) : "—"} unit="m" />
          <Readout label="Λόγος βάθους/δ" value={isFinite(deltaSoil) ? depthRatio.toFixed(2) : "—"} unit="× δ" tone="brass" />
          <Readout label="Εκτ. πλάτος σήματος" value={attenPct.toFixed(1)} unit="%" />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full border border-panel-line bg-readout">
          <div className="h-full bg-gradient-to-r from-phosphor-dim to-phosphor transition-all" style={{ width: `${attenPct}%` }} />
        </div>
      </Panel>

      {/* Section 4 — Target metal skin depth */}
      <Panel
        step="4"
        title="Skin Depth Υλικού-Στόχου (μr)"
        desc="Εκτίμηση διείσδυσης με το μοντέλο καλού αγωγού. ����ια μη μεταλλικά υλικά οι τιμές αγωγιμότητας είναι προσεγγιστικές και το αποτέλεσμα δεν αποτελεί πλήρες μοντέλο διηλεκτρικού συντονισμού."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Πλήθος μονάδων συγκέντρωσης" htmlFor="unit-multiplier">
            <select
              id="unit-multiplier"
              className={selectClass}
              value={unitMultiplier}
              onChange={(e) => setUnitMultiplier(Number.parseInt(e.target.value))}
            >
              {[1, 2, 3, 4].map((u) => (
                <option key={u} value={u}>
                  {u} μονάδα{u > 1 ? "δες" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">{ref.label}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Readout label="Συνολικός όγκος" value={totalVol.toLocaleString("el-GR", { maximumFractionDigits: 3 })} unit="cm³" tone="brass" />
          <Readout label="Συνολική μάζα" value={totalMass.toLocaleString("el-GR", { maximumFractionDigits: 1 })} unit="g" tone="brass" />
          <Readout label="Ισοδ. ακτίνα σφαίρας" value={rMm.toFixed(2)} unit="mm" tone="brass" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Readout
            label={`δ_target @ ${fSelFmt.val} ${fSelFmt.unit}`}
            value={isFinite(deltaMetal) ? (deltaMetal * 1000 < 50 ? (deltaMetal * 1000).toFixed(4) : deltaMetal.toFixed(4)) : "—"}
            unit={isFinite(deltaMetal) && deltaMetal * 1000 < 50 ? "mm" : "m"}
          />
          <Readout label="Ακτίνα / δ_target" value={isFinite(deltaMetal) ? metalRatio.toFixed(2) : "—"} unit="×" tone="brass" />
        </div>
        <p className="mt-3 rounded-sm border border-panel-line bg-secondary/30 px-3 py-2.5 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
          {!isFinite(deltaMetal)
            ? "—"
            : metalRatio < 0.5
              ? "Ισοδ. ακτίνα ≪ δ_target: ολόκληρος ο όγκος συμμετέχει (πλήρης διείσδυση)."
              : metalRatio < 3
                ? "Ισοδ. ακτίνα ≈ δ_target: μερική διείσδυση — απόκριση κυρίως από το εξωτερικό στρώμα."
                : "Ισοδ. ακτίνα ≫ δ_target: έντονο skin effect — μόνο λεπτή επιφανειακή φλούδα συμμετέχει."}
        </p>
      </Panel>

      {/* Section 5 — Chart */}
      <Panel
        step="5"
        title="Γράφημα Skin Depth vs Αρμονική"
        desc="Λογαριθμική κλίμακα. Χαμηλότερη αρμονική → μεγαλύτερο δ (βαθύτερη διείσδυση). Υψηλότερη → μικρότερο δ. Πέρασε τον δείκτη πάνω από τα σημεία."
      >
        <div className="mb-3 flex flex-wrap gap-4 font-mono text-[0.72rem]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-brass" /> έδαφος (σ={sigmaSoil} S/m)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-phosphor" /> μέταλλο ({mat.name})
          </span>
        </div>
        <SkinDepthChart data={chartData} />
      </Panel>

      {/* Section 6 — Refraction */}
      <Panel
        step="6"
        title="Μοντέλο Διάθ��ασης & Οριζόντια Απόκλιση (Drift)"
        desc="Οριζόντια απόκλιση σήματος βάσει πλήρους μιγαδικού δείκτη διάθλασης, Νόμου Snell στη διεπαφή εδάφους/α��ρα και γεωμετρικής ανάλυσης ray-path (GPR standard)."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Εκτ. βάθος στόχου d (m)" htmlFor="sec6-depth" warn={validateDepth(targetDepth)}>
            <input
              id="sec6-depth"
              type="number"
              step="0.1"
              min={0}
              className={inputClass}
              value={targetDepth}
              onChange={(e) => setTargetDepth(Number.parseFloat(e.target.value) || 0)}
            />
            <span className="mt-1 block font-mono text-[0.6rem] text-phosphor">συγχρονισμένο με §3 «βάθος στόχου»</span>
          </Field>
          <Field label="Διηλεκτρική σταθερά εδάφους" htmlFor="sec6-epsilon">
            <select id="sec6-epsilon" className={selectClass} value={sec6Soil} onChange={(e) => { setSec6Soil(e.target.value); setActivePreset("") }}>
              {REFRACTION_SOILS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Γωνία πρόσπτωσης θ₁" htmlFor="sec6-theta">
            <select id="sec6-theta" className={selectClass} value={sec6Theta} onChange={(e) => setSec6Theta(Number.parseFloat(e.target.value))}>
              <option value={15}>15° — Ομοιογενές έδαφος</option>
              <option value={35}>35° — Υπόγειος θάλαμος</option>
            </select>
          </Field>
          <Field label="Ύψος δέκτη h (m)" htmlFor="sec6-h">
            <select id="sec6-h" className={selectClass} value={sec6H} onChange={(e) => setSec6H(Number.parseFloat(e.target.value))}>
              {[0, 0.5, 1.0, 1.5].map((h) => (
                <option key={h} value={h}>{h} m{h === 1 ? " (τυπικό)" : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Άξονας ground dipole" htmlFor="sec6-dipole-axis">
            <select id="sec6-dipole-axis" className={selectClass} value={dipoleAxis} onChange={(e) => setDipoleAxis(e.target.value as DipoleAxis)}>
              <option value="NS">Βορράς–Νότος (εκπομπή Α–Δ)</option>
              <option value="EW">Ανατολή–Δύση (εκπομπή Β–Ν)</option>
            </select>
          </Field>
        </div>

        <p className="mt-4 rounded-sm border border-phosphor-dim/50 bg-secondary/30 px-3 py-2 font-mono text-[0.72rem] text-muted-foreground">
          Υπολογισμός στη συχνότητα εκπομπής:{" "}
          <span className="text-phosphor">{fmtHzOnly(fSelected)}</span>{" "}
          <span className="text-brass">({genRowLabel})</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-[0.72rem]">
            <thead>
              <tr className="text-left uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-panel-line px-2 py-2">Ζώνη</th>
                <th className="border-b border-panel-line px-2 py-2">n_r</th>
                <th className="border-b border-panel-line px-2 py-2">tan δ</th>
                <th className="border-b border-panel-line px-2 py-2">θ₂/ΟΕΑ</th>
                <th className="border-b border-panel-line px-2 py-2">x_exit</th>
                <th className="border-b border-panel-line px-2 py-2">x_total</th>
                <th className="border-b border-panel-line px-2 py-2">r_Fresnel</th>
                <th className="border-b border-panel-line px-2 py-2">Atten</th>
              </tr>
            </thead>
            <tbody>
              {refraction.rows.map((r) => {
                const isSelected = r.label === refraction.selectedLabel
                const lossValid = r.loss_tangent < 0.3
                return (
                  <tr key={r.label} className={isSelected ? "bg-secondary/50" : "hover:bg-secondary/20"}>
                    <td className={"px-2 py-1.5 " + (isSelected ? "text-brass" : "")}>
                      {isSelected ? "▸ " : ""}
                      {r.label}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: lossValid ? "var(--phosphor)" : "var(--brass)" }}>
                      {r.n_r.toFixed(4)}{!lossValid ? "*" : ""}
                    </td>
                    <td className="px-2 py-1.5">{r.loss_tangent.toFixed(3)}</td>
                    <td className="px-2 py-1.5">
                      {r.is_TIR ? `ΟΕΑ (${r.theta_c_deg.toFixed(1)}°)` : `${r.theta2_deg.toFixed(1)}°`}
                    </td>
                    <td className="px-2 py-1.5">{r.x_exit.toFixed(3)}</td>
                    <td className="px-2 py-1.5">{r.x_total.toFixed(3)}</td>
                    <td className="px-2 py-1.5">{r.r_fresnel.toFixed(3)}</td>
                    <td className="px-2 py-1.5">{r.atten_db.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {refraction.mainRow && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Readout label="Σημείο εξόδου" value={refraction.mainRow.x_exit.toFixed(2)} unit="m" />
              <Readout label="Ολική απόκλιση" value={refraction.mainRow.x_total.toFixed(2)} unit="m" tone="brass" />
              <Readout label="Ζώνη Fresnel" value={refraction.mainRow.r_fresnel.toFixed(2)} unit="m" />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Readout label="Ενεργό βάθος ανάκλασης d_eff" value={refraction.mainRow.d_eff.toFixed(3)} unit="m" />
              <Readout label="Μετατόπιση φλούδας (halo)" value={(refraction.mainRow.halo_shift * 100).toFixed(1)} unit="cm" tone="brass" />
              <Readout label="Απόκριση skin μετάλλου" value={(refraction.mainRow.metalResp * 100).toFixed(1)} unit="%" />
            </div>
            <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
              {refraction.mainRow.metalResp > 0.5
                ? `Ισχυρός ανακλαστήρας: η ανάκλαση γίνεται σε επιφανειακή φλούδα ~${(refraction.mainRow.halo_shift * 100).toFixed(1)} cm πιο ρηχά από το κέντρο, μειώνοντας ελαφρώς το drift κατά ~${((refraction.mainRow.x_exit - targetDepth * Math.tan((sec6Theta * Math.PI) / 180)) * 100).toFixed(1)} cm.`
                : "Ασθενής/διαπερατός στόχος: το κύμα περνά μέσα και ανακλάται ουσιαστικά στο κέντρο — αμελητέα μετατόπιση φλούδας."}
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="overflow-hidden rounded-sm border border-panel-line bg-readout p-2">
                <RayDiagram
                  d={targetDepth}
                  h={sec6H}
                  theta1={sec6Theta}
                  theta2={refraction.mainRow.theta2_deg}
                  isTIR={refraction.mainRow.is_TIR}
                  xExit={refraction.mainRow.x_exit}
                  xTotal={refraction.mainRow.x_total}
                  nr={refraction.mainRow.n_r}
                />
              </div>
              <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-panel-line bg-readout p-3">
                <Compass
                  bearing1={drift.bearing1}
                  bearing2={drift.bearing2}
                  xTotal={refraction.mainRow.x_total}
                  isTIR={refraction.mainRow.is_TIR}
                />
                <p className="text-center font-mono text-[0.68rem] text-muted-foreground">
                  Άξονας {drift.axis_label}
                </p>
              </div>
            </div>

            <div
              className="mt-4 rounded-sm border px-3.5 py-3 font-mono text-[0.76rem] leading-relaxed"
              style={
                refraction.mainRow.is_TIR || refraction.mainRow.x_total > 3
                  ? { borderColor: "var(--destructive)", background: "oklch(0.3 0.05 35 / 0.15)", color: "var(--destructive)" }
                  : { borderColor: "var(--phosphor-dim)", background: "oklch(0.4 0.08 155 / 0.08)", color: "var(--phosphor)" }
              }
            >
              {refraction.mainRow.is_TIR ? (
                <>⚠ Ολική Εσωτερική Ανάκλαση — Drift vector μη υπολογίσιμο. Μείωσε θ₁ ή επίλεξε έδαφος χαμηλότερης ε_r.</>
              ) : (
                <>
                  🧭 Εκτιμώμενο drift vector: {refraction.mainRow.x_total.toFixed(2)} m κατά μήκος άξονα {drift.axis_label}.
                  Πιθανή κατεύθυνση: {drift.dir1_label} (~{drift.bearing1.toFixed(0)}°) ή {drift.dir2_label} (~
                  {drift.bearing2.toFixed(0)}°). Το πρόσημο προσδιορίζεται επιτοπίως από τη σχετική θέση χρήστη–στόχου.
                </>
              )}
            </div>

            <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">
              Γεωμαγν. δεδομένα ({geomag.source}): D = {geomag.D >= 0 ? "+" : ""}
              {geomag.D.toFixed(1)}° | I = {geomag.I.toFixed(1)}° | Διόρθωση πυξίδας: γεωγρ. Β = μαγν. Β{" "}
              {geomag.D >= 0 ? "+" : "-"}
              {Math.abs(geomag.D).toFixed(1)}°
            </p>
          </>
        )}
      </Panel>

      <HistoryPanel lat={lat} lon={lon} capture={captureMeasurement} />

      <ExportButtons state={exportState} />
    </div>
  )
}
