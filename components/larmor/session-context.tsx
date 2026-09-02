"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
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
  computeComplexN,
  computeGprPropagation,
  computeSnell,
  metalSkinResponse,
  fresnelReflection,
  effectiveReflectionDepthM,
  computeDriftDirection,
  distanceAndBearingKm,
  computeDipoleField,
  computeDipoleInclination,
  computeMeasurementQuality,
  type DipoleAxis,
} from "@/lib/physics"
import type { GeomagResult } from "./location-panel"
import type { Measurement } from "./history-panel"

// ──────────────────────────────────────────────────────────────────────────
// Κοινή συνεδρία (session) όλης της εφαρμογής. Όλη η κατάσταση και οι
// υπολογισμοί ζουν εδώ, ώστε να μοιράζονται ανάμεσα στην κύρια σελίδα
// (ενότητες 1–6) και στη σελίδα χαρτογράφησης (ενότητες 7–8). Ο Provider
// τοποθετείται στο root layout, οπότε η κατάσταση επιβιώνει κατά την πλοήγηση
// ανάμεσα στις δύο σελίδες (client-side navigation δεν ξαναφορτώνει το layout).
// ──────────────────────────────────────────────────────────────────────────

function useLarmorSessionValue() {
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

  // Soil skin depth (section 3)
  const [soilType, setSoilType] = useState("0.01")
  const [sigmaCustom, setSigmaCustom] = useState(0.001)
  const [targetDepth, setTargetDepth] = useState(1)

  // Refraction (section 6)
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

  // Chart data — ομαδοποιημένες αρμονικές ζώνες (section 2β) αντί για τις πρώτες αρμονικές.
  const chartData = bands.map((b) => ({ label: b.label, n: b.n, f: b.f, soil: b.dSoil, metal: b.dMetal }))

  // Section 6 refraction
  const refraction = useMemo(() => {
    const [epsStr, sigStr] = sec6Soil.split("|")
    const epsilon_r = Number.parseFloat(epsStr)
    const sigma = Number.parseFloat(sigStr)
    const theta1_rad = (sec6Theta * Math.PI) / 180

    const computeRow = (label: string, f: number) => {
      if (!f || f <= 0) return null
      const { n_r, loss_tangent, skin_depth_m } = computeComplexN(epsilon_r, sigma, f)
      const { theta2_deg, is_TIR, theta_c_deg } = computeSnell(n_r, sec6Theta)
      const deltaMetalRow = skinDepth(f, mat.sigma, mat.muR)
      const metalResp = metalSkinResponse(rMm, deltaMetalRow)
      const fresnelR = fresnelReflection(mat.sigma, mat.muR, sigma, epsilon_r, f)
      const rEff = fresnelR * metalResp
      const { depth: d_eff, shift: halo_shift } = effectiveReflectionDepthM(targetDepth, rMm, metalResp)
      const x_exit = d_eff * Math.tan(theta1_rad)
      const x_total = is_TIR ? x_exit : x_exit + sec6H * Math.tan(((theta2_deg as number) * Math.PI) / 180)
      const v_soil = 3e8 / n_r
      const lambda = v_soil / f
      const r_fresnel = Math.sqrt(lambda * d_eff)
      const propagation = computeGprPropagation(epsilon_r, sigma, f, Math.hypot(d_eff, x_total))
      const atten_db = propagation.attenuationDb
      return { label, n_r, loss_tangent, theta2_deg, is_TIR, theta_c_deg, x_exit, x_total, r_fresnel, atten_db, f, skin_depth_m, propagation, d_eff, halo_shift, metalResp, fresnelR, rEff }
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

  // ── Δείκτες ποιότητας μέτρησης ──
  const quality = useMemo(
    () =>
      computeMeasurementQuality({
        bSource,
        lossTangent: refraction.mainRow?.loss_tangent ?? null,
        isTIR: refraction.mainRow?.is_TIR ?? false,
        distanceKm: endpoint.distanceKm,
        signalAmplitudePct: attenPct * (refraction.mainRow?.rEff ?? 1),
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

  // Κεντρικός υπολογισμός γεωμαγνητικού πεδίου για ένα σημείο.
  function computeFieldAt(la: number, lo: number) {
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return
    const uT = computeDipoleField(la, lo)
    handleBResult(uT, "Offline dipole (~10-20% σφάλμα)")
    setGeomag({ D: 4.2, I: computeDipoleInclination(la, lo), F: uT, H: uT * 0.83, X: uT * 0.82, Y: uT * 0.07, Z: uT * 0.56, uncertainty: null, secularVariation: { D: null, I: null, F: null }, source: "Offline dipole (D=default, I≈dipole)" })
  }

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

  return {
    // location / field
    lat, setLat, lon, setLon, elev, setElev, date, setDate,
    bfield, setBfield, bSource, setBSource, geomag, setGeomag,
    handleBResult,
    // material / harmonics
    materialId, setMaterialId, maxharm, setMaxharm, selectedN, setSelectedN,
    unitMultiplier, setUnitMultiplier,
    // soil / refraction inputs
    soilType, setSoilType, sigmaCustom, setSigmaCustom, targetDepth, setTargetDepth,
    sec6Soil, setSec6Soil, sec6Theta, setSec6Theta, sec6H, setSec6H, dipoleAxis, setDipoleAxis,
    // generator / observed
    generatorLat, setGeneratorLat, generatorLon, setGeneratorLon,
    generatorFrequency, setGeneratorFrequency, generatorBandLabel, setGeneratorBandLabel,
    rodLengthCm, rodSpacingCm, observedLat, setObservedLat, observedLon, setObservedLon,
    applyGeneratorLat, applyGeneratorLon,
    // presets / gps
    activePreset, setActivePreset, applyPreset, gpsStatus, useCurrentTargetLocation,
    // derived
    mat, sigmaSoil, f0, rMm, f0fmt, harmonics, bands, selectedBand,
    autoGeneratorFrequency, effectiveGeneratorFrequency, generatorFrequencyIsAuto, genRowLabel,
    fSelected, fSelFmt, deltaSoil, depthRatio, attenPct, deltaMetal, metalRatio,
    ref, totalVol, totalMass, chartData, refraction, drift, endpoint, quality, estimatedTarget,
    // capture / export
    captureMeasurement, exportState,
  }
}

export type LarmorSession = ReturnType<typeof useLarmorSessionValue>

const LarmorSessionContext = createContext<LarmorSession | null>(null)

export function LarmorSessionProvider({ children }: { children: ReactNode }) {
  const value = useLarmorSessionValue()
  return <LarmorSessionContext.Provider value={value}>{children}</LarmorSessionContext.Provider>
}

export function useLarmorSession(): LarmorSession {
  const ctx = useContext(LarmorSessionContext)
  if (!ctx) throw new Error("useLarmorSession must be used within a LarmorSessionProvider")
  return ctx
}
