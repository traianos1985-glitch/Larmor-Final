"use client"

import {
  MATERIALS,
  SOIL_TYPES,
  REFRACTION_SOILS,
  PRESETS,
  fmtHzOnly,
  fmtLength,
  fmtDelta,
  fmtBandFrequency,
  validateBField,
  validateDepth,
  validateSigma,
  type DipoleAxis,
} from "@/lib/physics"
import { Panel, Field, Readout, inputClass, selectClass } from "./primitives"
import { Spectrum } from "./spectrum"
import { SkinDepthChart } from "./skin-depth-chart"
import { Compass, RayDiagram } from "./drift-visuals"
import { LocationPanel } from "./location-panel"
import { HistoryPanel } from "./history-panel"
import { ExportButtons } from "./export-buttons"
import { useLarmorSession } from "./session-context"

export function Calculator() {
  const s = useLarmorSession()
  const {
    lat, lon, elev, date, bfield, geomag,
    setLat, setLon, setElev, setDate, handleBResult, setGeomag,
    generatorLat, generatorLon, observedLat, observedLon,
    setGeneratorLat, setGeneratorLon, setObservedLat, setObservedLon,
    materialId, setMaterialId, maxharm, setMaxharm, selectedN, setSelectedN,
    unitMultiplier, setUnitMultiplier,
    soilType, setSoilType, sigmaCustom, setSigmaCustom, targetDepth, setTargetDepth,
    sec6Soil, setSec6Soil, sec6Theta, setSec6Theta, sec6H, setSec6H, dipoleAxis, setDipoleAxis,
    setBfield, setBSource,
    generatorFrequencyIsAuto, genRowLabel, selectedBand, bands, setGeneratorBandLabel, setGeneratorFrequency,
    activePreset, setActivePreset, applyPreset,
    mat, sigmaSoil, f0, rMm, f0fmt, harmonics,
    fSelected, fSelFmt, deltaSoil, depthRatio, attenPct, deltaMetal, metalRatio,
    ref, totalVol, totalMass, chartData, refraction, drift,
    captureMeasurement, exportState,
  } = s

  const unitRef = ref

  return (
    <div className="flex flex-col gap-5">
      <LocationPanel
        lat={lat}
        lon={lon}
        elev={elev}
        date={date}
        bfield={bfield}
        bSource={s.bSource}
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
        desc="Ακέραια πολλαπλάσια της θεμελιώδους συχνότητας. Κάνε κλικ σε γραμμή του φάσματος για επιλογή αρμονικής."
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
          ★ Βέλτιστος: Μεγιστοποιεί το δ_soil × (1 − e^(−t/δ)). Το βέλτιστο f βρίσκεται εκεί όπου δ_metal ≈ ισοδύναμη
          ακτίνα του στόχου. ⚠ Στα 1/3/6 GHz μόνο τα πρώτα ~5-6 δεκαδικά είναι αξιόπιστα (όριο IEEE-754).
        </p>
      </Panel>

      {/* Section 3 — Soil skin depth */}
      <Panel
        step="3"
        title="Βάθος Διείσδυσης Σήματος (Skin Depth εδάφους)"
        desc={<>Το ΕΜ σήμα εξασθενεί εκθετικά με το βάθος. Για καλό αγωγό χρησιμοποιούμε ρητά <span className="font-mono text-foreground">δ = √(2 / (ω μ σ))</span>, όπου ω = 2πf και μ = μ₀μᵣ. Ισχύει κυρίως για καλούς αγωγούς και επίπεδα κύματα· για διηλεκτρικά/κοντινό πεδίο χρειάζεται πληρέστερο μοντέλο.</>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Τύπος εδάφους" htmlFor="soiltype">
            <select id="soiltype" className={selectClass} value={soilType} onChange={(e) => { setSoilType(e.target.value); setActivePreset("") }}>
              {SOIL_TYPES.map((soil) => (
                <option key={soil.value} value={soil.value}>
                  {soil.label}
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
        desc="Εκτίμηση διείσδυσης με το μοντέλο καλού αγωγού. Για μη μεταλλικά υλικά οι τιμές αγωγιμότητας είναι προσεγγιστικές και το αποτέλεσμα δεν αποτελεί πλήρες μοντέλο διηλεκτρικού συντονισμού."
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
        <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">{unitRef.label}</p>
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
        desc="Λογαριθμική κλίμακα, ανά ομαδοποιημένη ζώνη συχνότητας (§2β). Χαμηλότερη ζώνη → μεγαλύτερο δ (βαθύτερη διείσδυση). Υψηλότερη → μικρότερο δ. Πέρασε τον δείκτη πάνω από τα σημεία."
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
        title="Μοντέλο Διάθλασης & Οριζόντια Απόκλιση (Drift)"
        desc="Οριζόντια απόκλιση σήματος βάσει πλήρους μιγαδικού δείκτη διάθλασης, Νόμου Snell στη διεπαφή εδάφους/αέρα και γεωμετρικής ανάλυσης ray-path (GPR standard)."
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
              {REFRACTION_SOILS.map((soil) => (
                <option key={soil.value} value={soil.value}>{soil.label}</option>
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
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Readout label="Ανάκλαση Fresnel |Γ|²" value={(refraction.mainRow.fresnelR * 100).toFixed(1)} unit="%" />
              <Readout label="Ανακλαστική απόκριση R_eff" value={(refraction.mainRow.rEff * 100).toFixed(1)} unit="%" tone="brass" />
              <Readout label="Αδιαφάνεια (1−e^−t/δ)" value={(refraction.mainRow.metalResp * 100).toFixed(1)} unit="%" />
            </div>
            <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
              R_eff = |Γ|²·(1−e^(−t/δ)): ο νόμος Fresnel (πόσο ανακλάται στη διεπαφή) επί την αδιαφάνεια (αν φτάνει το κύμα εκεί).{" "}
              {refraction.mainRow.fresnelR > 0.5
                ? "Ισχυρή αναντιστοιχία εμπέδησης — καλός μεταλλικός ανακλαστήρας."
                : "Μικρή αναντιστοιχία εμπέδησης — σχεδόν διηλεκτρική, ασθενής ανάκλαση."}
            </p>
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
