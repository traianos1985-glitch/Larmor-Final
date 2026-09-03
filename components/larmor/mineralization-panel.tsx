"use client"

import { useMemo, useState } from "react"
import {
  SOIL_MINERALS,
  computeMineralizationRejection,
  fmtFrequency,
  type QualityStatus,
} from "@/lib/physics"
import { Panel, Field, Readout, inputClass, selectClass } from "./primitives"

function statusText(s: QualityStatus): string {
  return s === "good" ? "text-phosphor" : s === "warn" ? "text-brass" : "text-destructive"
}

function fmtFreq(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return "—"
  const f = fmtFrequency(hz)
  return `${f.val} ${f.unit}`
}

export function MineralizationPanel({ targetHz, targetLabel }: { targetHz: number; targetLabel: string }) {
  const [mineralId, setMineralId] = useState("loam")
  const [chiCustom, setChiCustom] = useState(300) // µSI (×10⁻⁶ SI)
  const [chiFdCustom, setChiFdCustom] = useState(5) // %
  const [filterStrength, setFilterStrength] = useState(85) // %

  const isCustom = mineralId === "custom"
  const preset = SOIL_MINERALS.find((m) => m.id === mineralId)

  // κ σε SI: τα presets αποθηκεύουν χ_SI· η custom τιμή δίνεται σε µSI (×10⁻⁶ SI).
  const chiSI = isCustom ? chiCustom * 1e-6 : (preset?.chiSI ?? 3e-4)
  const chiFdPct = isCustom ? chiFdCustom : (preset?.chiFdPct ?? 5)

  const res = useMemo(
    () =>
      computeMineralizationRejection({
        targetHz,
        chiSI,
        chiFdPct,
        filterStrength: filterStrength / 100,
      }),
    [targetHz, chiSI, chiFdPct, filterStrength],
  )

  const recTone =
    res.status === "good" ? "text-phosphor" : res.status === "warn" ? "text-brass" : "text-destructive"

  return (
    <Panel
      step="3β"
      title="Αυτόματο Φίλτρο Απόρριψης Ψευδο-Συντονισμού"
      desc={
        <>
          Η μαγνητική επιδεκτικότητα του εδάφους <span className="font-mono text-foreground">κ</span> (οξείδια σιδήρου,
          «hot rocks») ανεβάζει το τοπικό πεδίο κατά <span className="font-mono text-foreground">(1+κ)</span> και
          δημιουργεί μια «ψευδο-γραμμή» Larmor δίπλα στη γραμμή-στόχο. Το φίλτρο μοντελοποιεί ένα ground-balance/notch
          που αναιρεί την in-phase απόκριση· η ιξώδης συνιστώσα <span className="font-mono text-foreground">χ_fd</span>{" "}
          είναι ο μη-αναιρέσιμος θόρυβος.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Τύπος ορυκτοποίησης εδάφους" htmlFor="mineral-type">
          <select id="mineral-type" className={selectClass} value={mineralId} onChange={(e) => setMineralId(e.target.value)}>
            {SOIL_MINERALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            <option value="custom">Προσαρμοσμένη τιμή…</option>
          </select>
        </Field>
        {isCustom ? (
          <>
            <Field label="Επιδεκτικότητα κ (µSI)" htmlFor="chi-custom">
              <input
                id="chi-custom"
                type="number"
                step="10"
                min={0}
                className={inputClass}
                value={chiCustom}
                onChange={(e) => setChiCustom(Number.parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Συχνοτο-εξαρτημένη χ_fd (%)" htmlFor="chifd-custom">
              <input
                id="chifd-custom"
                type="number"
                step="0.5"
                min={0}
                max={50}
                className={inputClass}
                value={chiFdCustom}
                onChange={(e) => setChiFdCustom(Number.parseFloat(e.target.value) || 0)}
              />
            </Field>
          </>
        ) : (
          <Field label="Παράμετροι εδάφους" htmlFor="mineral-params">
            <div
              id="mineral-params"
              className="rounded-sm border border-panel-line bg-input px-3 py-2.5 font-mono text-sm text-muted-foreground"
            >
              κ = {(chiSI * 1e6).toLocaleString("el-GR", { maximumFractionDigits: 0 })} µSI · χ_fd = {chiFdPct}%
            </div>
          </Field>
        )}
      </div>

      <div className="mt-4">
        <Field label={`Ισχύς φίλτρου / ground balance — ${filterStrength}%`} htmlFor="filter-strength">
          <input
            id="filter-strength"
            type="range"
            min={0}
            max={100}
            step={1}
            value={filterStrength}
            onChange={(e) => setFilterStrength(Number.parseInt(e.target.value))}
            className="w-full cursor-pointer accent-brass"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Readout label={`Ψευδο-συντονισμός @ ${targetLabel}`} value={fmtFreq(res.falseResonanceHz)} tone="brass" />
        <Readout label="Απόκλιση Δf (target → ghost)" value={fmtFreq(res.deltaFHz)} tone="brass" />
        <Readout label="Απόρριψη in-phase" value={res.rejectionDb.toFixed(1)} unit="dB" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Readout label="Notch: κέντρο / εύρος" value={`${fmtFreq(res.notchCenterHz)} / ${fmtFreq(res.notchBandwidthHz)}`} tone="muted" />
        <Readout
          label="Υπόλοιπο θορύβου (viscous)"
          value={(res.residualFraction * 100).toFixed(1)}
          unit="%"
          tone={res.status === "good" ? "phosphor" : "brass"}
        />
      </div>

      {/* Before / after mineralization interference */}
      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            <span>Παρεμβολή εδάφους — χωρίς φίλτρο</span>
            <span className="font-mono text-destructive">{res.interferenceBefore.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-panel-line bg-readout">
            <div className="h-full bg-destructive/70 transition-all" style={{ width: `${res.interferenceBefore}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            <span>Παρεμβολή εδάφους — με φίλτρο</span>
            <span className={`font-mono ${statusText(res.status)}`}>{res.interferenceAfter.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-panel-line bg-readout">
            <div className="h-full bg-gradient-to-r from-phosphor-dim to-phosphor transition-all" style={{ width: `${res.interferenceAfter}%` }} />
          </div>
        </div>
      </div>

      <p className={`mt-4 rounded-sm border border-panel-line bg-secondary/30 px-3 py-2.5 font-mono text-[0.72rem] leading-relaxed ${recTone}`}>
        {res.recommendation}
      </p>
    </Panel>
  )
}
