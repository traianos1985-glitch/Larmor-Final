"use client"

import { useMemo } from "react"
import {
  computeComplexN,
  computeSnell,
  skinDepth,
  metalSkinResponse,
  fresnelReflection,
  effectiveReflectionDepthM,
  mineralizationRejection,
  frequencyConsensus,
  fmtFrequency,
  fmtLength,
  type FreqSample,
  type Material,
} from "@/lib/physics"
import { Panel, Readout } from "./primitives"

export interface FrequencyPrecisionProps {
  /** Βάση Larmor (Hz) */
  f0: number
  /** Πραγματική συχνότητα εκπομπής (κέντρο σαρώματος) — όπου ο στόχος αποκρίνεται */
  centerHintF: number
  /** Έδαφος διάθλασης */
  epsilon_r: number
  sigma: number
  sigmaSoil: number
  soilEpsR: number
  /** Γεωμετρία διάθλασης (ίδια με το tab Χαρτογράφησης) */
  theta1Deg: number
  sec6H: number
  targetDepth: number
  /** Στόχος */
  mat: Material
  rMm: number
}

/** Ίδιο μοντέλο x_total με το tab Χαρτογράφησης — μόνο για ανάγνωση/ανάλυση.
 *  Δεν πειράζει κανέναν από τους υπάρχοντες υπολογισμούς. */
function xTotalAt(f: number, p: FrequencyPrecisionProps) {
  const { n_r } = computeComplexN(p.epsilon_r, p.sigma, f)
  const { theta2_deg, is_TIR } = computeSnell(n_r, p.theta1Deg)
  const deltaMetal = skinDepth(f, p.mat.sigma, p.mat.muR)
  const metalResp = metalSkinResponse(p.rMm, deltaMetal)
  const fresnelR = fresnelReflection(p.mat.sigma, p.mat.muR, p.sigma, p.epsilon_r, f)
  const rEff = fresnelR * metalResp
  const { depth: d_eff } = effectiveReflectionDepthM(p.targetDepth, p.rMm, metalResp)
  const theta1 = (p.theta1Deg * Math.PI) / 180
  const x_exit = d_eff * Math.tan(theta1)
  const x_total = is_TIR ? x_exit : x_exit + p.sec6H * Math.tan(((theta2_deg as number) * Math.PI) / 180)
  return { x_total, rEff }
}

/** Ευανάγνωστη μορφοποίηση εύρους σε Hz (Hz / kHz / MHz). */
function fmtSpan(hz: number): { val: string; unit: string } {
  if (!Number.isFinite(hz) || hz <= 0) return { val: "0", unit: "Hz" }
  if (hz >= 1e6) return { val: (hz / 1e6).toFixed(3), unit: "MHz" }
  if (hz >= 1e3) return { val: (hz / 1e3).toFixed(2), unit: "kHz" }
  return { val: hz.toFixed(1), unit: "Hz" }
}

export function FrequencyPrecision(props: FrequencyPrecisionProps) {
  const { f0, centerHintF } = props

  const analysis = useMemo(() => {
    // Κέντρο σαρώματος = πραγματική συχνότητα εκπομπής (εκεί αποκρίνεται ο στόχος).
    const center = centerHintF > 0 ? centerHintF : f0
    if (!(center > 0)) return null
    // Λογαριθμικό σάρωμα ±~1 δεκάδα γύρω από το κέντρο.
    const SPAN = 8
    const fLow = center / SPAN
    const fHigh = center * SPAN
    const STEPS = 240
    const lnLow = Math.log(fLow)
    const lnHigh = Math.log(fHigh)
    const samples: FreqSample[] = []
    for (let i = 0; i <= STEPS; i++) {
      const f = Math.exp(lnLow + ((lnHigh - lnLow) * i) / STEPS)
      if (!(f > 0)) continue
      const { x_total, rEff } = xTotalAt(f, props)
      const clean = mineralizationRejection(f, props.sigmaSoil, props.soilEpsR).score
      samples.push({ n: f0 > 0 ? f / f0 : 0, f, x: x_total, weight: Math.max(0, rEff) * Math.max(0, clean) })
    }
    return frequencyConsensus(samples)
  }, [f0, centerHintF, props])

  if (!analysis) {
    return (
      <Panel title="Ακρίβεια Συχνότητας" desc="Δώσε έγκυρη βάση Larmor (f₀ > 0) για να τρέξει το σάρωμα.">
        <p className="font-mono text-sm text-muted-foreground">—</p>
      </Panel>
    )
  }

  const centerFmt = fmtFrequency(analysis.centerF)
  const lowFmt = fmtFrequency(analysis.sweepLowF)
  const highFmt = fmtFrequency(analysis.sweepHighF)
  const spanFmt = fmtSpan(analysis.sweepSpanHz)
  const halfFmt = fmtSpan(analysis.sweepHalfWidthHz)
  const consensusPct = Math.round(analysis.consensusScore * 100)

  return (
    <div className="flex flex-col gap-5">
      <Panel
        step="★"
        title="Ακρίβεια Συχνότητας — εύρωστη σύνθεση sweep"
        desc={
          <>
            Κριτήριο <strong>ελάχιστης μετατόπισης θέσης</strong> αντί για μέγιστη ισχύ. Το σάρωμα υπολογίζει το{" "}
            <span className="font-mono text-foreground">x_total(f)</span> σε όλο το εύρος αρμονικών, βρίσκει το πιο
            επίπεδο σημείο και βγάζει βασική συχνότητα + εύρος sweep. Καθαρά ενημερωτικό — δεν αλλάζει τους
            υπολογισμούς των άλλων tab.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Readout label="Βασική συχνότητα (κέντρο)" value={centerFmt.val} unit={centerFmt.unit} tone="brass" />
          <Readout
            label="Εύρωστη θέση (διάμεσος x_total)"
            value={fmtLength(analysis.robustX)}
            tone="phosphor"
          />
          <Readout label="Εύρος sweep (± γύρω από κέντρο)" value={halfFmt.val} unit={"± " + halfFmt.unit} tone="phosphor" />
          <Readout label="Ολικό εύρος sweep" value={spanFmt.val} unit={spanFmt.unit} tone="phosphor" />
        </div>

        <div className="mt-4 rounded-sm border border-phosphor-dim bg-readout px-4 py-3.5">
          <p className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">Οδηγία γεννήτριας</p>
          <p className="mt-1.5 font-mono text-sm text-phosphor">
            Σάρωσε από <span className="text-brass">{lowFmt.val} {lowFmt.unit}</span> έως{" "}
            <span className="text-brass">{highFmt.val} {highFmt.unit}</span>
            <span className="text-phosphor-dim">
              {" "}
              (κέντρο {centerFmt.val} {centerFmt.unit} ± {halfFmt.val} {halfFmt.unit})
            </span>
          </p>
          <p className="mt-1 font-mono text-[0.68rem] text-muted-foreground">
            Στη ζώνη αυτή η εκτίμηση θέσης μένει σταθερή (ανοχή ±{(analysis.toleranceM * 100).toFixed(0)} cm).
          </p>
        </div>
      </Panel>

      <Panel
        title="Διαγνωστικά σταθερότητας"
        desc="Πόσο αξιόπιστη είναι η σύνθεση: συμφωνία δειγμάτων και έλεγχος μονοτονικότητας."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Readout
            label="Συμφωνία συχνοτήτων (consensus)"
            value={String(consensusPct)}
            unit="%"
            tone={consensusPct >= 60 ? "phosphor" : "brass"}
          />
          <Readout
            label="Καμπύλη x_total(f)"
            value={analysis.monotonic ? "μονότονη" : "μη-μονότονη"}
            tone={analysis.monotonic ? "phosphor" : "brass"}
          />
        </div>

        {!analysis.monotonic && (
          <div className="mt-4 rounded-sm border border-brass-dim bg-secondary/40 px-4 py-3.5">
            <p className="font-mono text-sm text-brass">⚑ Μη-μονότονο x_total(f) — regime κοντινού πεδίου.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              Η απόσταση δεν αλλάζει ομαλά με τη συχνότητα, άρα η εκτίμηση μέσω x_total είναι επισφαλής εδώ.
              Ρίξε το βάρος της απόστασης και στηρίξου στη <strong>διόπτευση/τριγωνισμό</strong> (tab Χαρτογράφηση).
            </p>
          </div>
        )}

        <SweepChart samples={analysis.samples} robustX={analysis.robustX} centerF={analysis.centerF} />
      </Panel>
    </div>
  )
}

/** Συμπαγές γράφημα x_total ως προς τη συχνότητα, με το κέντρο και τον διάμεσο. */
function SweepChart({
  samples,
  robustX,
  centerF,
}: {
  samples: { f: number; x: number }[]
  robustX: number
  centerF: number
}) {
  if (samples.length < 2) return null
  const W = 640
  const H = 180
  const padL = 40
  const padR = 12
  const padT = 12
  const padB = 26
  const fs = samples.map((s) => s.f)
  const xs = samples.map((s) => s.x)
  const fMin = Math.min(...fs)
  const fMax = Math.max(...fs)
  const xMin = Math.min(...xs, robustX)
  const xMax = Math.max(...xs, robustX)
  const fx = (f: number) => padL + ((f - fMin) / (fMax - fMin || 1)) * (W - padL - padR)
  const xy = (x: number) => H - padB - ((x - xMin) / (xMax - xMin || 1)) * (H - padT - padB)

  const path = samples.map((s, i) => `${i === 0 ? "M" : "L"}${fx(s.f).toFixed(1)},${xy(s.x).toFixed(1)}`).join(" ")
  const medianY = xy(robustX)
  const centerX = fx(centerF)

  return (
    <figure className="mt-4 overflow-hidden rounded-sm border border-panel-line bg-readout">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Γράφημα x_total ως προς τη συχνότητα">
        {/* διάμεσος (εύρωστη θέση) */}
        <line
          x1={padL}
          x2={W - padR}
          y1={medianY}
          y2={medianY}
          stroke="var(--color-brass, #b8894a)"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.8"
        />
        {/* κεντρική συχνότητα */}
        <line
          x1={centerX}
          x2={centerX}
          y1={padT}
          y2={H - padB}
          stroke="var(--color-phosphor, #7fe0b0)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        {/* καμπύλη x_total(f) */}
        <path d={path} fill="none" stroke="var(--color-phosphor, #7fe0b0)" strokeWidth="1.6" />
        <text x={padL} y={H - 8} className="fill-muted-foreground" fontSize="10" fontFamily="monospace">
          f →
        </text>
        <text x={W - padR} y={medianY - 4} textAnchor="end" className="fill-brass" fontSize="10" fontFamily="monospace">
          {fmtLength(robustX)}
        </text>
      </svg>
    </figure>
  )
}
