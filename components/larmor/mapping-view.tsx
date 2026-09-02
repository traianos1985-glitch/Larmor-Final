"use client"

import { Crosshair } from "lucide-react"
import {
  fmtBandFrequency,
  fmtHzOnly,
  validateLat,
  validateLon,
} from "@/lib/physics"
import { Panel, Field, Readout, inputClass, selectClass, buttonClass } from "./primitives"
import { TriangulationPanel } from "./triangulation-panel"
import { useLarmorSession } from "./session-context"

export function MappingView() {
  const {
    generatorLat, generatorLon, applyGeneratorLat, applyGeneratorLon,
    generatorFrequency, setGeneratorFrequency, setGeneratorBandLabel,
    generatorFrequencyIsAuto, selectedBand, bands, autoGeneratorFrequency, effectiveGeneratorFrequency,
    rodSpacingCm, rodLengthCm,
    useCurrentTargetLocation, gpsStatus,
    observedLat, setObservedLat, observedLon, setObservedLon,
    endpoint, estimatedTarget, quality,
  } = useLarmorSession()

  return (
    <div className="flex flex-col gap-5">
      {/* Section 7 — Final mapping */}
      <Panel step="7" title="Τελική χαρτογράφηση & πειραματική εκτίμηση θέσης" desc="Αφού επιλέξεις υλικό, πεδίο και συχνότητα, κατέγραψε τη γεννήτρια και το σημείο που δείχνουν οι βέργες. Η απόσταση και η διόπτευση είναι πειραματικές εκτιμήσεις.">
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

        {/* Ανάλυση δεικτών ποιότητας */}
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

      {/* Section 8 — Triangulation */}
      <TriangulationPanel
        currentGenerator={{ lat: generatorLat, lon: generatorLon }}
        currentBearing={endpoint.bearingDeg}
      />
    </div>
  )
}
