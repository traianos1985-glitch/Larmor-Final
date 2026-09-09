/* ============================================================
   ΑΝΑΒΑΘΜΙΣΕΙΣ ΑΚΡΙΒΕΙΑΣ — μη-επεμβατικό στρώμα
   ------------------------------------------------------------
   ΔΕΝ πειράζει τίποτα από την αρχική φυσική/λογική. Επαναχρησιμοποιεί
   ΜΟΝΟ τις ήδη υπάρχουσες, δοκιμασμένες συναρτήσεις του lib/physics.ts
   (computeComplexN, computeSnell, skinDepth, metalSkinResponse,
   effectiveReflectionDepthM, fresnelReflection, mineralizationRejection)
   και προσθέτει από πάνω τρεις αναβαθμίσεις:

   1) Dispersion-sensitivity selector — ∂x_total/∂f (πόσο μετακινείται η
      εκτίμηση θέσης αν αστοχήσει λίγο η f). Η πιο ακριβής συχνότητα είναι
      το στάσιμο σημείο όπου η καμπύλη x_total(f) είναι πιο επίπεδη.
      Δείκτης σταθερότητας = 1/(1 + |∂x/∂f|).

   2) Πολυσυχνοτική εύρωστη σύνθεση — σταθμισμένο διάμεσο του x_total σε
      ένα sweep συχνοτήτων, με βάρη rEff × mineralizationRejection.score ×
      (σταθερότητα διασποράς). Ο διάμεσος «κόβει» τα artifacts.

   3) Guard μη-μονοτονικότητας — αν η ακολουθία x_total(f) δεν είναι
      μονοτονική, σηκώνει flag και υπολογίζει έναν «Frequency spread»
      δείκτη εμπιστοσύνης.

   ΟΛΕΣ οι συχνότητες σε Hz.
============================================================ */

import {
  computeComplexN,
  computeSnell,
  skinDepth,
  metalSkinResponse,
  effectiveReflectionDepthM,
  fresnelReflection,
  mineralizationRejection,
} from "./physics"

/** Παράμετροι που ορίζουν πλήρως την καμπύλη x_total(f) — ίδιες ακριβώς με
 *  αυτές που ήδη χρησιμοποιεί το section 6 (διάθλαση) της εφαρμογής. */
export interface SweepParams {
  /** ε_r εδάφους διάθλασης */
  epsilonR: number
  /** σ εδάφους διάθλασης (S/m) — για computeComplexN & Fresnel */
  refractionSigma: number
  /** σ εδάφους section 3 (S/m) — για την απόρριψη ορυκτοποίησης */
  mineralizationSigma: number
  /** γωνία πρόσπτωσης θ₁ (μοίρες) */
  theta1Deg: number
  /** ύψος βέργας h (m) */
  hM: number
  /** εκτιμώμενο βάθος στόχου (m) */
  targetDepthM: number
  /** ισοδύναμη ακτίνα στόχου (mm) */
  rMm: number
  /** αγωγιμότητα μετάλλου (S/m) */
  matSigma: number
  /** σχετική μαγνητική διαπερατότητα μετάλλου */
  matMuR: number
  /** ε_r εδάφους για την απόρριψη ορυκτοποίησης */
  soilEpsR: number
}

/**
 * Πλευρική ολίσθηση x_total(f) — ΠΙΣΤΗ αναπαραγωγή του υπολογισμού του
 * section 6 (computeRow) ως καθαρή συνάρτηση της συχνότητας. Δεν αλλάζει
 * κανέναν τύπο· απλώς καλεί τις ίδιες συναρτήσεις physics.
 */
export function xTotalAtFrequency(f: number, p: SweepParams): number | null {
  if (!(f > 0)) return null
  const { n_r } = computeComplexN(p.epsilonR, p.refractionSigma, f)
  const { theta2_deg, is_TIR } = computeSnell(n_r, p.theta1Deg)
  const deltaMetal = skinDepth(f, p.matSigma, p.matMuR)
  const metalResp = metalSkinResponse(p.rMm, deltaMetal)
  const { depth: d_eff } = effectiveReflectionDepthM(p.targetDepthM, p.rMm, metalResp)
  const theta1Rad = (p.theta1Deg * Math.PI) / 180
  const x_exit = d_eff * Math.tan(theta1Rad)
  if (is_TIR || theta2_deg == null) return x_exit
  return x_exit + p.hM * Math.tan((theta2_deg * Math.PI) / 180)
}

/** Ανακλαστική απόκριση R_eff = |Γ|² · (1 − e^(−t/δ_metal)) στη συχνότητα f. */
export function reflectionResponse(f: number, p: SweepParams): number {
  const deltaMetal = skinDepth(f, p.matSigma, p.matMuR)
  const metalResp = metalSkinResponse(p.rMm, deltaMetal)
  const fresnelR = fresnelReflection(p.matSigma, p.matMuR, p.refractionSigma, p.epsilonR, f)
  return fresnelR * metalResp
}

/* ---------- Αναβάθμιση #1: Dispersion-sensitivity ---------- */
export interface SensitivityResult {
  f: number
  xTotal: number | null
  /** ∂x_total/∂f σε m/Hz (κεντρική διαφορά) */
  dxdf: number
  /** μετατόπιση θέσης (m) ανά 1% μεταβολή της f — πιο διαισθητικό μέγεθος */
  dxdfPerPercent: number
  /** δείκτης σταθερότητας ∈ (0,1]: 1/(1 + |∂x/∂f ανά 1%|) */
  stability: number
}

/**
 * Πόσο ευαίσθητη είναι η εκτίμηση θέσης στη συχνότητα, γύρω από την f.
 * Χρησιμοποιεί κεντρική πεπερασμένη διαφορά με βήμα ανάλογο της f.
 */
export function positionalSensitivity(f: number, p: SweepParams): SensitivityResult {
  const x0 = xTotalAtFrequency(f, p)
  const df = Math.max(f * 1e-4, 1) // Hz
  const xUp = xTotalAtFrequency(f + df, p)
  const xDn = xTotalAtFrequency(f - df, p)
  let dxdf = 0
  if (x0 != null && xUp != null && xDn != null) dxdf = (xUp - xDn) / (2 * df)
  const dxdfPerPercent = dxdf * (f * 0.01)
  const stability = 1 / (1 + Math.abs(dxdfPerPercent))
  return { f, xTotal: x0, dxdf, dxdfPerPercent, stability }
}

/* ---------- Sweep window (τα «Hz πάνω-κάτω») ---------- */
export interface SweepWindow {
  /** ± Hz γύρω από το κέντρο ώστε |Δx_total| ≤ ανοχή */
  deltaHz: number
  fLo: number
  fHi: number
  xLo: number | null
  xHi: number | null
  /** εύρος μετατόπισης θέσης μέσα στο παράθυρο (m) */
  xSpanM: number
}

/**
 * Το παράθυρο sweep γύρω από μια αρμονική: πόσα Hz πάνω-κάτω μπορούμε να
 * σαρώσουμε ώστε η εκτίμηση θέσης να μη μετακινηθεί πάνω από την ανοχή tolM.
 * Το ανώτατο εύρος φράσσεται στο maxDeltaHz (τυπικά μισή απόσταση αρμονικών)
 * ώστε το sweep να μην «πατάει» τη γειτονική αρμονική.
 */
export function sweepWindowForTolerance(
  f: number,
  p: SweepParams,
  tolM: number,
  maxDeltaHz: number,
): SweepWindow {
  const x0 = xTotalAtFrequency(f, p)
  const cap = Math.min(maxDeltaHz, f * 0.999)
  if (x0 == null || !(cap > 0)) {
    return { deltaHz: 0, fLo: f, fHi: f, xLo: x0, xHi: x0, xSpanM: 0 }
  }
  const steps = 80
  let best = 0
  for (let i = 1; i <= steps; i++) {
    const d = (cap * i) / steps
    const xu = xTotalAtFrequency(f + d, p)
    const xd = xTotalAtFrequency(f - d, p)
    if (xu == null || xd == null) break
    if (Math.abs(xu - x0) <= tolM && Math.abs(xd - x0) <= tolM) best = d
    else break
  }
  const xLo = xTotalAtFrequency(f - best, p)
  const xHi = xTotalAtFrequency(f + best, p)
  const span = xLo != null && xHi != null ? Math.abs(xHi - xLo) : 0
  return { deltaHz: best, fLo: f - best, fHi: f + best, xLo, xHi, xSpanM: span }
}

/* ---------- Αναβάθμιση #2 & #3: Consensus + guard ---------- */
export interface BandCandidate {
  label: string
  n: number
  f: number
}

export interface SweepRow {
  label: string
  n: number
  f: number
  xTotal: number | null
  dxdfPerPercent: number
  stability: number
  rEff: number
  cleanScore: number
  weight: number
  window: SweepWindow
  isRecommended: boolean
}

export interface ConsensusResult {
  rows: SweepRow[]
  /** σταθμισμένο διάμεσο του x_total (m) — εύρωστη σύνθεση */
  weightedMedianM: number | null
  /** απλό διάμεσο του x_total (m) — για σύγκριση */
  simpleMedianM: number | null
  /** εύρος x_total στις ζώνες (m) */
  spreadM: number
  /** «σταθερή περιοχή»: [min, max] του x_total στις ζώνες (m) */
  stableRange: [number, number] | null
  monotonic: boolean
  monotonicDir: "up" | "down" | "none"
  /** Frequency-spread δείκτης εμπιστοσύνης ∈ [0,1]: 1 = σφιχτή συστάδα */
  spreadFactor: number
  recommendedLabel: string | null
}

function weightedMedian(pairs: { value: number; weight: number }[]): number | null {
  const valid = pairs.filter((p) => Number.isFinite(p.value) && p.weight > 0)
  if (!valid.length) return null
  valid.sort((a, b) => a.value - b.value)
  const total = valid.reduce((s, p) => s + p.weight, 0)
  let acc = 0
  for (const p of valid) {
    acc += p.weight
    if (acc >= total / 2) return p.value
  }
  return valid[valid.length - 1].value
}

function simpleMedian(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/**
 * Εύρωστη πολυσυχνοτική σύνθεση + guard μη-μονοτονικότητας.
 * @param candidates οι ήδη ομαδοποιημένες αρμονικές (ζώνες) της εφαρμογής
 * @param f0 θεμελιώδης Larmor (Hz) — ορίζει το ανώτατο εύρος sweep
 * @param recommendedLabel ετικέτα ζώνης με το μεγαλύτερο κριτήριο σταθερότητας
 */
export function frequencyConsensus(
  candidates: BandCandidate[],
  p: SweepParams,
  f0: number,
  tolM: number,
): ConsensusResult {
  const maxDeltaHz = Math.max(f0 * 0.5, 1)

  // Βρες πρώτα την πιο σταθερή ζώνη (ελάχιστη ευαισθησία θέσης).
  let bestLabel: string | null = null
  let bestStability = -1
  for (const c of candidates) {
    const s = positionalSensitivity(c.f, p)
    if (s.stability > bestStability) {
      bestStability = s.stability
      bestLabel = c.label
    }
  }

  const rows: SweepRow[] = candidates.map((c) => {
    const s = positionalSensitivity(c.f, p)
    const rEff = reflectionResponse(c.f, p)
    const { score: cleanScore } = mineralizationRejection(c.f, p.mineralizationSigma, p.soilEpsR)
    const weight = rEff * cleanScore * s.stability
    const window = sweepWindowForTolerance(c.f, p, tolM, maxDeltaHz)
    return {
      label: c.label,
      n: c.n,
      f: c.f,
      xTotal: s.xTotal,
      dxdfPerPercent: s.dxdfPerPercent,
      stability: s.stability,
      rEff,
      cleanScore,
      weight,
      window,
      isRecommended: c.label === bestLabel,
    }
  })

  const xs = rows.map((r) => r.xTotal).filter((x): x is number => x != null)
  const weightedMedianM = weightedMedian(
    rows.filter((r) => r.xTotal != null).map((r) => ({ value: r.xTotal as number, weight: r.weight })),
  )
  const simpleMedianM = simpleMedian(xs)
  const minX = xs.length ? Math.min(...xs) : 0
  const maxX = xs.length ? Math.max(...xs) : 0
  const spreadM = xs.length ? maxX - minX : 0
  const stableRange: [number, number] | null = xs.length ? [minX, maxX] : null

  // Μονοτονικότητα ως προς αύξουσα συχνότητα.
  const sorted = [...rows].filter((r) => r.xTotal != null).sort((a, b) => a.f - b.f)
  let up = true
  let down = true
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].xTotal as number
    const cur = sorted[i].xTotal as number
    if (cur < prev - 1e-9) up = false
    if (cur > prev + 1e-9) down = false
  }
  const monotonic = sorted.length <= 1 || up || down
  const monotonicDir: ConsensusResult["monotonicDir"] = up && down ? "none" : up ? "up" : down ? "down" : "none"

  const ref = weightedMedianM ?? simpleMedianM ?? 0
  const rel = ref !== 0 ? spreadM / Math.abs(ref) : spreadM > 0 ? 1 : 0
  const spreadFactor = 1 / (1 + rel)

  return {
    rows,
    weightedMedianM,
    simpleMedianM,
    spreadM,
    stableRange,
    monotonic,
    monotonicDir,
    spreadFactor,
    recommendedLabel: bestLabel,
  }
}

/** Μορφοποίηση συχνότητας ΠΑΝΤΑ σε Hz (πλήρης ακρίβεια, el-GR). */
export function fmtHz(hz: number, decimals = 2): string {
  if (!Number.isFinite(hz)) return "—"
  return (
    hz.toLocaleString("el-GR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + " Hz"
  )
}

/** Μορφοποίηση μήκους σε m/cm/mm για τα readouts θέσης. */
export function fmtMeters(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return "—"
  const a = Math.abs(m)
  if (a < 0.01) return (m * 1000).toFixed(2) + " mm"
  if (a < 1) return (m * 100).toFixed(2) + " cm"
  return m.toFixed(3) + " m"
}
