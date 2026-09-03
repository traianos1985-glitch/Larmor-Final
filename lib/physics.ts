/* ============================================================
   PHYSICS CORE — Larmor & Αρμονικές
   Πιστή μεταφορά των τύπων του πρωτότυπου single-file εργαλείου
   σε καθαρές, δοκιμάσιμες συναρτήσεις TypeScript.

   Πηγές:
   - γ (γυρομαγνητικός λόγος): IAEA "Recommended Nuclear Magnetic
     Moments" + CODATA 2018 (kherb.io/docs/nmr_table)
   - δ = √(2/ωμσ)  (skin depth, standard EM)
   - n* = √(ε_r − jσ/ωε₀)  (Balanis, Advanced Engineering EM)
   - x = d·tan(θ₁) + h·tan(θ₂)  (GPR ray-tracing, EPA manual)
   - r_F = √(λ·d)  (Fresnel zone)
   - A = −20·d/δ·log₁₀e  dB  (plane-wave attenuation)
============================================================ */

// Θεμελιώδεις σταθερές — τιμές CODATA 2018 / ορισμοί SI (ακρίβεια IEEE-754 double).
export const C = 299792458 // m/s — ταχύτητα φωτός στο κενό (ακριβής ορισμός SI)
export const MU0 = 4 * Math.PI * 1e-7 // H/m — μαγνητική διαπερατότητα κενού (κλασικός ορισμός)
// ε₀ = 1/(μ₀·c²) — παράγεται από τα μ₀ και c ώστε οι τρεις σταθερές να είναι απόλυτα συνεπείς
// (= 8.8541878128e-12 F/m, CODATA 2018).
export const EPSILON_0 = 1 / (MU0 * C * C) // F/m

export interface Material {
  id: string
  name: string
  /** γ/2π σε MHz/T, πλήρης ακρίβεια double */
  gamma: number
  /** ηλεκτρική αγωγιμότητα μετάλλου, S/m */
  sigma: number
  /** σχετική μαγνητική διαπερατότητα */
  muR: number
  /** πυκνότητα, g/cm³ */
  density: number
}

export const MATERIALS: Material[] = [
  { id: "au197", name: "Χρυσός (¹⁹⁷Au)", gamma: 0.7378670245778789, sigma: 4.1e7, muR: 1.0, density: 19.3 },
  { id: "ag109", name: "Άργυρος (¹⁰⁹Ag)", gamma: 1.9896492846623755, sigma: 6.3e7, muR: 1.0, density: 10.49 },
  { id: "cu63", name: "Χαλκός (⁶³Cu)", gamma: 11.311420179117773, sigma: 5.96e7, muR: 1.0, density: 8.96 },
  { id: "al27", name: "Αλουμίνιο (²⁷Al)", gamma: 11.100630067688776, sigma: 3.77e7, muR: 1.0, density: 2.7 },
  { id: "fe57", name: "Σίδηρος (⁵⁷Fe)", gamma: 1.3818237005731187, sigma: 1.0e7, muR: 5000, density: 7.87 },
  { id: "sb121", name: "Αντιμόνιο (¹²¹Sb)", gamma: 10.238667225340981, sigma: 2.55e6, muR: 1.0, density: 6.68 },
  { id: "b11", name: "Βόριο (¹¹B)", gamma: 13.66160796005943, sigma: 1.0e-4, muR: 1.0, density: 2.34 },
  // Για μη μεταλλικούς στόχους η ηλεκτρική αγωγιμότητα/μr είναι προσεγγιστικές τιμές.
  // Οι συχνότητες NMR αναφέρονται στα συνηθέστερα φυσικά ισότοπα/πυρήνες.
  // Ο ¹²C έχει πυρηνικό σπιν I=0 → δεν έχει μαγνητική ροπή/συχνότητα NMR.
  // Το NMR-ενεργό ισότοπο άνθρακα (και του διαμαντιού) είναι ο ¹³C.
  { id: "c12-diamond", name: "Διαμάντι (¹³C)", gamma: 10.707746367473973, sigma: 1.0e-12, muR: 1.0, density: 3.515 },
  { id: "mn55", name: "Μαγγάνιο (⁵⁵Mn)", gamma: 10.570707386401027, sigma: 6.94e5, muR: 1.0, density: 7.21 },
  { id: "ba-no3-2", name: "Νιτρικό βάριο Ba(NO₃)₂ (¹⁴N)", gamma: 3.076272817251739, sigma: 1.0e-8, muR: 1.0, density: 3.24 },
  { id: "n14", name: "Άζωτο (¹⁴N)", gamma: 3.076272817251739, sigma: 1.0e-8, muR: 1.0, density: 1.251e-3 },
]

export function getMaterial(id: string): Material {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]
}

/* ---------- Μονάδες αναφοράς (ιστορικά κειμήλια) ---------- */
export interface UnitRef {
  mass_g: number
  volume_cm3: number
  label: string
}
const UNIT_REFS: Record<string, UnitRef> = {
  au197: { mass_g: 21960, volume_cm3: 1138, label: "Ιστορικό κειμήλιο Au — 21.960 g / 1.138 cm³ ανά μονάδα" },
  b11: { mass_g: 2.4, volume_cm3: 1.02, label: "Ίχνος B — 2,4 g / 1,02 cm³ ανά μονάδα" },
}
const DEFAULT_REF_VOL_CM3 = 1138

export function getUnitRef(mat: Material): UnitRef {
  if (UNIT_REFS[mat.id]) return UNIT_REFS[mat.id]
  const vol = DEFAULT_REF_VOL_CM3
  return { mass_g: vol * mat.density, volume_cm3: vol, label: `Μονάδα αναφοράς ${vol} cm³ (ίδια γεωμετρία με Au)` }
}

/** Ισοδύναμη ακτίνα σφαίρας (mm) από συνολικό όγκο n μονάδων. r = (3V/4π)^(1/3) */
export function effectiveRadiusMm(mat: Material, units: number): number {
  const ref = getUnitRef(mat)
  const totalVolM3 = units * ref.volume_cm3 * 1e-6
  const radiusM = Math.pow((3 * totalVolM3) / (4 * Math.PI), 1 / 3)
  return radiusM * 1000
}

/* ------------------------------------------------------------
   Θεμελιώδης συχνότητα Larmor: f(Hz) = γ[MHz/T] × B[µT]
   (Math.abs στο B — αρνητικό μέτρο πεδίου δεν έχει φυσικό νόημα)
------------------------------------------------------------ */
export function larmorHz(gamma: number, bMicroT: number): number {
  return gamma * Math.abs(bMicroT || 0)
}

export function skinDepth(f: number, sigma: number, muR = 1): number {
  if (f <= 0 || sigma <= 0) return Number.POSITIVE_INFINITY
  const omega = 2 * Math.PI * f
  return Math.sqrt(2 / (omega * MU0 * muR * sigma))
}

/* ---------- Μορφοποίηση ---------- */
export function fmtFrequency(hz: number): { val: string; unit: string } {
  if (hz >= 1e6) return { val: (hz / 1e6).toFixed(3), unit: "MHz" }
  if (hz >= 1e3) return { val: (hz / 1e3).toFixed(3), unit: "kHz" }
  return { val: hz.toFixed(2), unit: "Hz" }
}

export function fmtHzOnly(hz: number): string {
  return hz.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Hz"
}

export function fmtLength(m: number): string {
  if (!isFinite(m) || m <= 0) return "—"
  return m < 1 ? (m * 1000).toFixed(2) + "mm" : m.toFixed(3) + "m"
}

export function fmtDelta(m: number): string {
  if (!isFinite(m) || m <= 0) return "—"
  if (m < 1e-3) return (m * 1e6).toFixed(2) + "µm"
  if (m < 1) return (m * 1e3).toFixed(2) + "mm"
  if (m < 1000) return m.toFixed(2) + "m"
  return (m / 1000).toFixed(2) + "km"
}

/* ============================================================
   ΖΩΝΕΣ ΕΝΔΙΑΦΕΡΟΝΤΟΣ
============================================================ */
export type Criterion = "2dec" | "firstdec0" | "lastdig0" | "optimal"

export interface BandDef {
  label: string
  target: number | null
  criterion: Criterion
}

export const BANDS: BandDef[] = [
  { label: "~50 MHz", target: 50e6, criterion: "2dec" },
  { label: "~230 MHz", target: 230e6, criterion: "firstdec0" },
  { label: "~1 GHz", target: 1e9, criterion: "lastdig0" },
  { label: "~3 GHz", target: 3e9, criterion: "lastdig0" },
  { label: "~6 GHz", target: 6e9, criterion: "lastdig0" },
  { label: "★ Βέλτιστος", target: null, criterion: "optimal" },
]

/* ============================================================
   ΤΥΠΟΣ ΕΚΠΟΜΠΗΣ ΓΕΝΝΗΤΡΙΑΣ — Ημίτονο / Τετράγωνο
   Η κυματομορφή εξόδου καθορίζει ΠΟΙΕΣ αρμονικές υπάρχουν στο σήμα:
   • Ημίτονο (sine): καθαρή θεμελιώδης — καμία αρμονική (μόνο n=1).
   • Τετράγωνο (square): σειρά Fourier με ΜΟΝΟ περιττές αρμονικές
     (n = 1, 3, 5, 7, …) και σχετικό πλάτος 1/n.
============================================================ */
export type Waveform = "sine" | "square"

export interface WaveformDef {
  value: Waveform
  label: string
  desc: string
}

export const WAVEFORMS: WaveformDef[] = [
  { value: "sine", label: "Ημίτονο (Sine)", desc: "Καθαρή θεμελιώδης — χωρίς αρμονικές (μόνο n=1)." },
  { value: "square", label: "Τετράγωνο (Square)", desc: "Μόνο περιττές αρμονικές (n = 1, 3, 5, …), πλάτος 1/n." },
]

/** Σχετικό πλάτος της n-οστής αρμονικής για δεδομένη κυματομορφή (θεμελιώδης = 1). */
export function harmonicAmplitude(waveform: Waveform, n: number): number {
  if (n < 1) return 0
  if (waveform === "sine") return n === 1 ? 1 : 0
  // Τετράγωνο: σειρά Fourier — μόνο περιττές αρμονικές, πλάτος 1/n.
  return n % 2 === 1 ? 1 / n : 0
}

/** Υπάρχει η n-οστή αρμονική στο φάσμα της κυματομορφής; */
export function isHarmonicPresent(waveform: Waveform, n: number): boolean {
  return harmonicAmplitude(waveform, n) > 0
}

export function satisfiesCriterion(f: number, criterion: Criterion): boolean {
  switch (criterion) {
    case "2dec":
      return true
    case "firstdec0":
      return f % 1 < 0.1
    case "lastdig0":
      return Math.round(f) % 10 === 0
    default:
      return true
  }
}

export function findNearestHarmonic(
  f0: number,
  targetHz: number,
  criterion: Criterion,
  isAllowed: (n: number) => boolean = () => true,
): { n: number; f: number } {
  if (f0 <= 0 || targetHz <= 0) return { n: 1, f: f0 }
  const n0 = Math.max(1, Math.round(targetHz / f0))

  // Πλησιέστερη ΕΠΙΤΡΕΠΤΗ (εκπεμπόμενη) αρμονική στο n0. Η θεμελιώδης (n=1) υπάρχει
  // πάντα σε κάθε πραγματική κυματομορφή, οπότε αν η κυματομορφή δεν επιτρέπει καμία
  // κοντινή αρμονική (π.χ. ημίτονο → μόνο n=1, ενώ ο στόχος είναι εκατομμύρια αρμονικές
  // πιο ψηλά) η ζώνη «πέφτει» στη θεμελιώδη ΑΝΤΙ να επιστρέφει μη-εκπεμπόμενη αρμονική.
  const nearestAllowed = (): { n: number; f: number } => {
    if (isAllowed(n0)) return { n: n0, f: f0 * n0 }
    for (let dn = 1; dn <= 5000; dn++) {
      if (n0 - dn >= 1 && isAllowed(n0 - dn)) return { n: n0 - dn, f: f0 * (n0 - dn) }
      if (isAllowed(n0 + dn)) return { n: n0 + dn, f: f0 * (n0 + dn) }
    }
    return { n: 1, f: f0 }
  }

  // Για την «2dec» κάθε συχνότητα ικανοποιεί το κριτήριο, οπότε αρκεί η πλησιέστερη
  // ΕΠΙΤΡΕΠΤΗ αρμονική στο n0 (π.χ. περιττή για τετράγωνο, μόνο n=1 για ημίτονο).
  if (criterion === "2dec") {
    return nearestAllowed()
  }

  const WINDOW = 250
  let bestN: number | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (let dn = 0; dn <= WINDOW; dn++) {
    const candidates = dn === 0 ? [n0] : [n0 + dn, n0 - dn]
    for (const n of candidates) {
      if (n < 1 || !isAllowed(n)) continue
      const f = f0 * n
      if (satisfiesCriterion(f, criterion)) {
        const dist = Math.abs(f - targetHz)
        if (dist < bestDist) {
          bestDist = dist
          bestN = n
        }
      }
    }
    if (bestN !== null && dn > 15) break
  }
  // Fallback: αν καμία επιτρεπτή αρμονική δεν ικανοποιεί το κριτήριο στο παράθυρο,
  // επιστρέφουμε την πλησιέστερη ΕΠΙΤΡΕΠΤΗ (τελικά τη θεμελιώδη) — ποτέ μη-εκπεμπόμενη.
  return bestN !== null ? { n: bestN, f: f0 * bestN } : nearestAllowed()
}

/* ============================================================
   FRESNEL REFLECTION — Συντελεστής ανάκλασης στη διεπαφή
   εδάφους → μετάλλου από τις εγγενείς κυματικές εμπεδήσεις.

     η = √( jωμ / (σ + jωε) )              (intrinsic wave impedance, Balanis)
     Γ = (η_metal − η_soil)/(η_metal + η_soil)   (Fresnel, κάθετη πρόσπτωση)
     R = |Γ|²                               (ανακλώμενη ισχύς)

   Είναι ΔΙΑΦΟΡΕΤΙΚΟ φαινόμενο από την «αδιαφάνεια» (1 − e^(−t/δ)):
   ο Fresnel λέει ΠΟΣΟ ανακλάται στη διεπαφή, η αδιαφάνεια αν ΦΤΑΝΕΙ το
   κύμα εκεί. Η πραγματική ανακλαστική απόκριση είναι το γινόμενό τους:
     R_eff = |Γ|² · (1 − e^(−t/δ))

   • Ευγενή μέταλλα (σ~10⁷): η_metal ~ mΩ ≪ η_soil ~ 100s Ω → |Γ|≈1. ✓
   • Ίχνος Βορίου (σ=10⁻⁴): σχεδόν διηλεκτρικό, μικρή αναντιστοιχία → |Γ|≈0. ✓
============================================================ */
interface Complex {
  re: number
  im: number
}
function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}
function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im }
}
function cDiv(a: Complex, b: Complex): Complex {
  const den = b.re * b.re + b.im * b.im || Number.MIN_VALUE
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den }
}
function cSqrt(z: Complex): Complex {
  const r = Math.hypot(z.re, z.im)
  const theta = Math.atan2(z.im, z.re)
  const sr = Math.sqrt(r)
  return { re: sr * Math.cos(theta / 2), im: sr * Math.sin(theta / 2) }
}
function cAbs2(z: Complex): number {
  return z.re * z.re + z.im * z.im
}

/** Εγγενής κυματική εμπέδηση η = √(jωμ/(σ+jωε)) ενός μέσου στη συχνότητα f. */
export function intrinsicImpedance(sigma: number, epsilonR: number, muR: number, f: number): Complex {
  const omega = 2 * Math.PI * f
  const num: Complex = { re: 0, im: omega * MU0 * Math.max(muR, 0) } // jωμ
  const den: Complex = { re: Math.max(sigma, 0), im: omega * EPSILON_0 * Math.max(epsilonR, 1e-6) } // σ + jωε
  return cSqrt(cDiv(num, den))
}

/**
 * Συντελεστής ανάκλασης ισχύος R = |Γ|² ∈ [0,1] στη διεπαφή εδάφους → μετάλλου
 * (κάθετη πρόσπτωση) από τις εγγενείς εμπεδήσεις των δύο μέσων.
 */
export function fresnelReflection(
  metalSigma: number,
  metalMuR: number,
  soilSigma: number,
  soilEpsR: number,
  f: number,
  metalEpsR = 1,
): number {
  if (f <= 0) return 0
  const etaM = intrinsicImpedance(metalSigma, metalEpsR, metalMuR, f)
  const etaS = intrinsicImpedance(soilSigma, soilEpsR, 1, f)
  const gamma = cDiv(cSub(etaM, etaS), cAdd(etaM, etaS))
  return Math.max(0, Math.min(1, cAbs2(gamma)))
}

/**
 * Βέλτιστη αρμονική: max δ_soil × R_eff, όπου
 * R_eff = |Γ|²·(1 − e^(−t/δ_metal)) — συντελεστής Fresnel (πόσο ανακλάται
 * στη διεπαφή) επί την αδιαφάνεια (αν φτάνει το κύμα εκεί).
 */
export function findOptimalCombo(
  f0: number,
  sigmaSoil: number,
  mat: Material,
  thicknessMm: number,
  soilEpsR = 10,
  isAllowed: (n: number) => boolean = () => true,
): { n: number; f: number; score: number } | null {
  if (f0 <= 0) return null
  const t = thicknessMm / 1000

  let fOpt = 1e3
  if (t > 0 && mat.sigma > 0 && mat.muR > 0) {
    fOpt = 1 / (Math.PI * MU0 * mat.muR * mat.sigma * t * t)
  }
  fOpt = Math.max(f0, Math.min(10e9, fOpt))

  const n0 = Math.max(1, Math.round(fOpt / f0))
  const WINDOW = 1500
  let bestN = isAllowed(n0) ? n0 : 1
  let bestScore = Number.NEGATIVE_INFINITY

  for (let dn = -WINDOW; dn <= WINDOW; dn++) {
    const n = n0 + dn
    if (n < 1 || !isAllowed(n)) continue
    const f = f0 * n
    const omega = 2 * Math.PI * f
    const dSoil = sigmaSoil > 0 ? Math.sqrt(2 / (omega * MU0 * sigmaSoil)) : 0
    const dMetal =
      mat.sigma > 0 && mat.muR > 0 ? Math.sqrt(2 / (omega * MU0 * mat.muR * mat.sigma)) : Number.POSITIVE_INFINITY
    const metalResp = isFinite(dMetal) && dMetal > 0 && t > 0 ? 1 - Math.exp(-t / dMetal) : 0
    // Fresnel: πόσο ανακλάται στη διεπαφή εδάφους→μετάλλου (ισχύς).
    const reflR = fresnelReflection(mat.sigma, mat.muR, sigmaSoil, soilEpsR, f)
    // Πλή��ης ανακλαστική απόκριση = αδιαφάνεια × ανακλαστικότητα Fresnel.
    const score = dSoil * metalResp * reflR
    if (score > bestScore) {
      bestScore = score
      bestN = n
    }
  }
  return { n: bestN, f: f0 * bestN, score: bestScore }
}

/* ============================================================
   ΦΙΛΤΡΟ ΑΠΟΡΡΙΨΗΣ ΟΡΥΚΤΟΠΟΙΗΣΗΣ (Mineralization Rejection)
   ------------------------------------------------------------
   ΔΕΝ παράγει νέες συχνότητες ούτε νέους κανόνες. Προσ����έτει ΜΟΝΟ ένα
   ακόμη κριτήριο ταξινόμησης πάνω στις ήδη υπάρχουσες ομαδοποιημένες
   αρμονικές: πόσο μακριά πέφτει κάθε αρμονική από τη «ζώνη θορύβου»
   του μαγνητικού/ορυκτοποιημένου εδάφους.

   Φυσική βάση (ίδιες παράμετροι που ήδη χρησιμοποιεί η εφαρμογή):
   Το έδαφος συμπεριφέρεται ως αγωγός όταν tan δ = σ/(ωε₀ε_r) ≫ 1 και
   ως διηλεκτρικό όταν tan δ ≪ 1. Η μετάβαση γίνεται στη «γωνιακή»
   συχνότητα ορυκτοποίησης:

       f_c = σ / (2π · ε₀ · ε_r)          (tan δ = 1)

   • f ≪ f_c → ζώνη αγωγιμότητας/ορυκτοποίησης: υψηλός θόρυβος εδάφους,
     «βρόμικη» γραμμή.
   • f ≫ f_c → διηλεκτρική ζώνη: το έδαφος γίνεται σχεδόν διαφανές,
     καθαρότερη γραμμή.

   Η «απόσταση από τη ζώνη» μετριέται σε δεκάδες (log₁₀ f/f_c). Όσο πιο
   πάνω από την f_c βρίσκεται η αρμονική, τόσο καθαρότερη.
============================================================ */
export interface MineralizationInfo {
  /** Γωνιακή συχνότητα ορυκτοποίησης f_c = σ/(2π ε₀ ε_r), Hz */
  fc: number
  /** log₁₀(f/f_c): θετικό = πάνω από τη ζώνη (καθαρό), αρνητικό = μέσα στη ζώνη */
  clearanceDecades: number
  /** Δείκτης καθαρότητας ∈ [0,1] — όσο μεγαλύτερος, τόσο μακριά από τη ζώνη θορύβου */
  score: number
  status: "good" | "warn" | "bad"
}

/** Συχνότητα μετάβασης αγωγού→διηλεκτρικού (tan δ = 1) του εδάφους. */
export function mineralizationCornerHz(sigmaSoil: number, epsRSoil: number): number {
  if (sigmaSoil <= 0) return 0
  return sigmaSoil / (2 * Math.PI * EPSILON_0 * Math.max(epsRSoil, 1e-6))
}

/** Δείκτης απόρριψης ορυκτοποίησης για μία συχνότητα f, με βάση την απόστασή
 *  της (σε δεκάδες) από τη ζώνη θορύβου του εδάφους f_c. */
export function mineralizationRejection(f: number, sigmaSoil: number, epsRSoil = 10): MineralizationInfo {
  const fc = mineralizationCornerHz(sigmaSoil, epsRSoil)
  if (f <= 0 || fc <= 0) {
    return { fc, clearanceDecades: Number.POSITIVE_INFINITY, score: 1, status: "good" }
  }
  const clearanceDecades = Math.log10(f / fc)
  // Γραμμικός δείκτης στις δεκάδες: f=f_c → 0.5, +2 δεκ. → 1.0, −2 δεκ. → 0.
  const score = Math.max(0, Math.min(1, 0.5 + clearanceDecades / 4))
  const status: MineralizationInfo["status"] =
    clearanceDecades >= 1 ? "good" : clearanceDecades >= -0.3 ? "warn" : "bad"
  return { fc, clearanceDecades, score, status }
}

/**
 * Σύσταση «καθαρής» αρμονικής ΜΕΣΑ από τις ήδη υπάρχουσες ζώνες.
 * Διατηρεί όλα τα υπάρχοντα κριτήρια (skin depth εδάφους × ανακλαστική
 * απόκριση R_eff = |Γ|²·(1 − e^(−t/δ_metal))) και προσθέτει ΜΟΝΟ τον
 * παράγοντα καθαρότητας ορυκτοποίησης. Επιστρέφει την ετικέτα ζώνης με
 * το μεγαλύτερο σύνθετο σκορ — δεν εφευρίσκει καμία συχνότητα εκτός λίστας.
 */
export function recommendCleanBand(
  candidates: { label: string; f: number }[],
  sigmaSoil: number,
  mat: Material,
  thicknessMm: number,
  epsRSoil = 10,
): { label: string; composite: number } | null {
  if (!candidates.length) return null
  let best: { label: string; composite: number } | null = null
  for (const c of candidates) {
    if (!(c.f > 0)) continue
    const dSoil = skinDepth(c.f, sigmaSoil)
    const dMetal = skinDepth(c.f, mat.sigma, mat.muR)
    const metalResp = metalSkinResponse(thicknessMm, dMetal)
    const fresnelR = fresnelReflection(mat.sigma, mat.muR, sigmaSoil, epsRSoil, c.f)
    const rEff = fresnelR * metalResp
    // Υπάρχοντα κριτήρια (ίδια με το ★ Βέλτιστο): δ_soil × R_eff.
    const merit = (isFinite(dSoil) ? dSoil : 0) * rEff
    // Νέο κριτήριο: πολλαπλασιαστής καθαρότητας ζώνης ορυκτοποίησης.
    const { score } = mineralizationRejection(c.f, sigmaSoil, epsRSoil)
    const composite = merit * score
    if (!best || composite > best.composite) best = { label: c.label, composite }
  }
  return best
}

export function fmtBandFrequency(f: number, criterion: Criterion): string {
  try {
    switch (criterion) {
      case "2dec":
        return f.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Hz"
      case "firstdec0":
        return f.toLocaleString("el-GR", { minimumFractionDigits: 7, maximumFractionDigits: 10 }) + " Hz"
      case "lastdig0":
        return f.toLocaleString("el-GR", { minimumFractionDigits: 5, maximumFractionDigits: 8 }) + " Hz"
      default:
        return f.toLocaleString("el-GR", { minimumFractionDigits: 4, maximumFractionDigits: 10 }) + " Hz"
    }
  } catch {
    return f.toFixed(5) + " Hz"
  }
}

/* ============================================================
   OFFLINE DIPOLE MODEL (fallback)
   Γεωκεντρικό αξονικό-κεκλιμένο δίπολο (tilted dipole).
   B(λm) = B0 · √(1 + 3·sin²(λm))   — μέτρο πεδίου στη γεωμαγνητική
   γεωγρ. πλάτος λm, με B0 το ισημερινό επιφανειακό πεδίο του διπόλου.

   Παράμετροι από IGRF-13 (εποχή 2020):
   - Γεωμαγνητικός βόρειος πόλος (dipole) ≈ 80.65°N, 72.68°W
   - B0 = m·μ0/(4π R³) ≈ 29 800 nT  (ισημερινό επιφανειακό πεδίο)
============================================================ */
export const GEOMAG_POLE = { lat: 80.65, lon: -72.68 }
const B0_EQUATORIAL_NT = 29800

export function computeDipoleField(latDeg: number, lonDeg: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const phi = toRad(latDeg)
  const phi0 = toRad(GEOMAG_POLE.lat)
  const dLon = toRad(lonDeg - GEOMAG_POLE.lon)
  const sinLambdaM = Math.sin(phi) * Math.sin(phi0) + Math.cos(phi) * Math.cos(phi0) * Math.cos(dLon)
  const lambdaM = Math.asin(Math.max(-1, Math.min(1, sinLambdaM)))
  const bNT = B0_EQUATORIAL_NT * Math.sqrt(1 + 3 * Math.sin(lambdaM) ** 2)
  return bNT / 1000 // µT
}

export function distanceAndBearingKm(lat1: number, lon1: number, lat2: number, lon2: number): { distanceKm: number; bearingDeg: number } {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const phi1 = toRad(lat1)
  const phi2 = toRad(lat2)
  const dPhi = toRad(lat2 - lat1)
  const dLambda = toRad(lon2 - lon1)
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const y = Math.sin(dLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda)
  return { distanceKm, bearingDeg: (toDeg(Math.atan2(y, x)) + 360) % 360 }
}

export function computeDipoleInclination(latDeg: number, lonDeg: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const phi0 = toRad(GEOMAG_POLE.lat)
  const dLon = toRad(lonDeg - GEOMAG_POLE.lon)
  const sinLm = Math.sin(toRad(latDeg)) * Math.sin(phi0) + Math.cos(toRad(latDeg)) * Math.cos(phi0) * Math.cos(dLon)
  const lambdaM = Math.asin(Math.max(-1, Math.min(1, sinLm)))
  return (Math.atan(2 * Math.tan(lambdaM)) * 180) / Math.PI
}

/* ============================================================
   ΜΟΝΤΕΛΟ ΔΙΑΘΛΑΣΗΣ (Snell / Fresnel / GPR ray-path)
============================================================ */
export function computeComplexN(epsilon_r: number, sigma: number, f: number) {
  const omega = 2 * Math.PI * f
  const loss_tangent = sigma / (omega * EPSILON_0 * epsilon_r)
  const sqrtTerm = Math.sqrt(1 + loss_tangent * loss_tangent)
  const n_r = Math.sqrt((epsilon_r / 2) * (sqrtTerm + 1))
  const kappa = Math.sqrt((epsilon_r / 2) * (sqrtTerm - 1))
  const beta = omega * n_r / C
  const alpha = omega * kappa / C
  const skin_depth_m = alpha > 0 ? 1 / alpha : Number.POSITIVE_INFINITY
  return { n_r, kappa, loss_tangent, skin_depth_m, alpha, beta }
}

/** Lossy-wave propagation for a GPR ray segment. Returns amplitude and phase terms.
 * This is a plane-wave approximation; antenna pattern, polarization and layered geometry
 * still require a full Maxwell/GPR forward model.
 */
export function computeGprPropagation(epsilon_r: number, sigma: number, f: number, distanceM: number) {
  const medium = computeComplexN(epsilon_r, sigma, f)
  const distance = Math.max(0, distanceM)
  const amplitude = Math.exp(-medium.alpha * distance)
  const phaseRad = medium.beta * distance
  const wavelengthM = medium.beta > 0 ? (2 * Math.PI) / medium.beta : Number.POSITIVE_INFINITY
  return {
    ...medium,
    distanceM: distance,
    amplitude,
    attenuationDb: 20 * Math.log10(Math.max(amplitude, Number.MIN_VALUE)),
    phaseRad,
    wavelengthM,
  }
}

/* ------------------------------------------------------------
   HALO SHELL — Ενεργό βάθος ανάκλασης λόγω μάζας/όγκου στόχου
   ------------------------------------------------------------
   Το x_total καθορίζεται από το έδαφος και τη γεωμετρία (n_r, d, h, θ₁).
   Η μάζα ΔΕΝ αλλάζει τη θ₂· επηρεάζει ΠΟΥ γίνεται η ανάκλαση:

   • Ισχυρός ανακλαστήρας (ευγενή μέταλλα, δ_metal ~ 1 µm): ολική ανάκλαση
     σε λεπτή επιφανειακή «φλούδα» στην ΚΟΡΥΦΗ του στόχου — δηλαδή μία
     ισοδύναμη ακτίνα r πιο ΡΗΧΑ από το γεωμετρικό κέντρο.
   • Ασθενής/διαπερατός στόχος (ίχνος Βορίου, δ_metal ≫ πάχος): το κύμα
     περνά μέσα και «βλέπει» ουσιαστικά το κέντρο — καμία μετατόπιση φλούδας.

   Η μετατόπιση σταθμίζεται με την απόκριση skin του μετάλλου
   metalResp = 1 − e^(−t/δ_metal) ∈ [0,1]:
     d_eff = max(0, d − metalResp · r)
   Έτσι το x_exit = d_eff·tan(θ₁) μειώνεται ελα��ρώς (ρηχότερη ανάκλαση),
   που εξηγεί το μικρό αρνητικό drift της «πλήρους» περίπτωσης.
*/
export function metalSkinResponse(radiusMm: number, deltaMetalM: number): number {
  const t = Math.max(0, radiusMm) / 1000
  if (!isFinite(deltaMetalM) || deltaMetalM <= 0 || t <= 0) return 0
  return 1 - Math.exp(-t / deltaMetalM)
}

export function effectiveReflectionDepthM(
  centerDepthM: number,
  radiusMm: number,
  metalResp: number,
): { depth: number; shift: number } {
  const rM = Math.max(0, radiusMm) / 1000
  const resp = Math.max(0, Math.min(1, metalResp))
  const shift = resp * rM
  return { depth: Math.max(0, centerDepthM - shift), shift }
}

export function computeSnell(n_r: number, theta1_deg: number) {
  const theta1 = (theta1_deg * Math.PI) / 180
  const theta_c = Math.asin(Math.min(1, 1 / n_r))
  const sinTheta2 = n_r * Math.sin(theta1)
  if (sinTheta2 >= 1) {
    return { theta2_deg: null as number | null, is_TIR: true, theta_c_deg: (theta_c * 180) / Math.PI }
  }
  const theta2 = Math.asin(sinTheta2)
  return { theta2_deg: (theta2 * 180) / Math.PI, is_TIR: false, theta_c_deg: (theta_c * 180) / Math.PI }
}

export type DipoleAxis = "NS" | "EW"

export function computeDriftDirection(dipoleAxis: DipoleAxis, declination: number) {
  const D = declination
  let bearing_mag_1: number, bearing_mag_2: number, axis_label: string, dir1_label: string, dir2_label: string
  if (dipoleAxis === "NS") {
    bearing_mag_1 = 90
    bearing_mag_2 = 270
    axis_label = "Ανατολή–Δύση (E–W)"
    dir1_label = "ΑΝΑΤΟΛΙΚΑ"
    dir2_label = "ΔΥΤΙΚΑ"
  } else {
    bearing_mag_1 = 0
    bearing_mag_2 = 180
    axis_label = "Βορράς–Νότος (N–S)"
    dir1_label = "ΒΟΡΕΙΑ"
    dir2_label = "ΝΟΤΙΑ"
  }
  const b1 = (((bearing_mag_1 + D) % 360) + 360) % 360
  const b2 = (((bearing_mag_2 + D) % 360) + 360) % 360
  return { bearing1: b1, bearing2: b2, axis_label, dir1_label, dir2_label, D }
}

/* ---------- Τύποι εδάφους ---------- */
export interface SoilType {
  value: string
  label: string
  sigma: number
}
export const SOIL_TYPES: SoilType[] = [
  { value: "0.0001", label: "Βραχώδες / ξηρό (σ = 0.0001 S/m)", sigma: 0.0001 },
  { value: "0.001", label: "Ξηρό / αμμώδες (σ = 0.001 S/m)", sigma: 0.001 },
  { value: "0.01", label: "Μέτριο / υγρό (σ = 0.01 S/m)", sigma: 0.01 },
  { value: "0.05", label: "Αργιλώδες / υγρό (σ = 0.05 S/m)", sigma: 0.05 },
  { value: "0.1", label: "Κορεσμένο / βαλτώδες (σ = 0.1 S/m)", sigma: 0.1 },
]

/* ---------- Έδαφος για διάθλαση (ε_r | σ) ---------- */
export const REFRACTION_SOILS = [
  { value: "4|0.001", label: "Ξηρό / Αμμώδες — ε_r=4, σ=0.001 S/m", eps: 4, sigma: 0.001 },
  { value: "10|0.01", label: "Μέσο / Μικτό — ε_r=10, σ=0.01 S/m", eps: 10, sigma: 0.01 },
  { value: "25|0.05", label: "Υγρό / Αργιλώδες — ε_r=25, σ=0.05 S/m", eps: 25, sigma: 0.05 },
]

/* ============================================================
   ΑΥΤΟΜΑΤΟΣ ΤΥΠΟΣ ΕΔΑΦΟΥΣ ΑΠΟ ΥΓΡΑΣΙΑ (Open-Meteo soil moisture)
   ------------------------------------------------------------
   Η ογκομετρική υγρασία εδάφους θ (VWC, m³/m³) καθορίζει τόσο τη
   σχετική διηλεκτρική σταθερά ε_r όσο και την αγωγιμότητα σ του εδάφους:

   • ε_r από την εμπειρική εξίσωση Topp (1980), ευρέως αποδεκτή για
     μετρήσεις TDR/GPR:
         ε_r = 3.03 + 9.3·θ + 146·θ² − 76.7·θ³
   • σ αυξάνει μονότονα με την υγρασία (νερό + διαλυμένα άλατα άγουν το
     ρεύμα). Χρησιμοποιείται προσεγγιστικό μοντέλο τύπου νόμου δύναμης
     αγκυρωμένο στους διακριτούς τύπους εδάφους της εφαρμογής.

   Οι τιμές «κουμπώνουν» στους υπάρχοντες τύπους (SOIL_TYPES /
   REFRACTION_SOILS) ώστε να τροφοδο��ούν απευθείας τα ίδια selects.
============================================================ */
export function soilMoisturePermittivity(vwc: number): number {
  const t = Math.max(0, Math.min(0.6, vwc))
  const eps = 3.03 + 9.3 * t + 146 * t * t - 76.7 * t * t * t
  return Math.max(1, eps)
}

/** Προσεγγιστική αγωγιμότητα εδάφους (S/m) από την ογκομετρική υγρασία θ. */
export function soilMoistureConductivity(vwc: number): number {
  const t = Math.max(0, Math.min(0.6, vwc))
  // Μονότονο μοντέλο νόμου-δύν��μης: θ≈0.02→~1e-4, 0.08→~1e-3, 0.18→~1e-2,
  // 0.30→~5e-2, ≥0.45→~1e-1 S/m (συνεπές με τους τύπους εδάφους της εφαρμογής).
  const sigma = 0.9 * Math.pow(t, 2.6)
  return Math.max(1e-4, Math.min(0.15, sigma))
}

export interface SoilClassification {
  /** Ογκομετρική υγρασία θ (m³/m³) */
  vwc: number
  /** Εκτιμώμενη αγωγιμότητα σ (S/m) */
  sigma: number
  /** Εκτιμώμενη σχετική διηλεκτρική σταθερά ε_r (Topp) */
  epsR: number
  /** Τιμή για το select του section 3 (SOIL_TYPES) */
  soilTypeValue: string
  /** Τιμή για το select του section 6 (REFRACTION_SOILS, «ε_r|σ») */
  sec6SoilValue: string
  /** Σύντομη περιγραφή κατηγορίας εδάφους */
  label: string
}

/** Ταξινομεί την υγρασία εδάφους σε τύπο εδάφους της εφαρμογής (κουμπώνει στα υπάρχοντα selects). */
export function classifySoilFromMoisture(vwc: number): SoilClassification {
  const t = Math.max(0, Math.min(0.6, vwc))
  const sigma = soilMoistureConductivity(t)
  const epsR = soilMoisturePermittivity(t)

  let soilTypeValue: string
  let label: string
  if (t < 0.05) {
    soilTypeValue = "0.0001"
    label = "Βραχώδες / πολύ ξηρό"
  } else if (t < 0.12) {
    soilTypeValue = "0.001"
    label = "Ξηρό / αμμώδες"
  } else if (t < 0.22) {
    soilTypeValue = "0.01"
    label = "Μέτριο / υγρό"
  } else if (t < 0.35) {
    soilTypeValue = "0.05"
    label = "Αργιλώδες / υγρό"
  } else {
    soilTypeValue = "0.1"
    label = "Κορεσμένο / βαλτώδες"
  }

  // Έδαφος διάθλασης (μόνο 3 επιλογές ε_r|σ).
  const sec6SoilValue = t < 0.12 ? "4|0.001" : t < 0.28 ? "10|0.01" : "25|0.05"

  return { vwc: t, sigma, epsR, soilTypeValue, sec6SoilValue, label }
}

/* ============================================================
   ΜΑΓΝΗΤΙΚΗ ΟΡΥΚΤΟΠΟΙΗΣΗ ΠΕΡΙΟΧΗΣ (NOAA EMAG2 v3)
   ------------------------------------------------------------
   Το EMAG2 δίνει τη μαγνητική ανωμαλία του φλοιού (nT) — δηλαδή την
   απόκλιση από το ομαλό πεδίο αναφοράς λόγω μαγνητικών ορυκτών
   (κυρίως μαγνητίτη). Μεγάλο |ΔB| ⇒ έντονη μαγνητική ορυκτοποίηση,
   που σημαίνει «θορυβώδες» έδαφος για ανίχνευση μετάλλων.
============================================================ */
export interface MagneticMineralization {
  /** Μαγνητική ανωμαλία φλοιού ΔB (nT) */
  anomalyNt: number
  level: "low" | "moderate" | "high" | "extreme"
  label: string
  /** Δείκτης «θορύβου» ορυκτοποίησης ∈ [0,1] */
  noiseIndex: number
}

export function classifyMagneticMineralization(anomalyNt: number): MagneticMineralization {
  const a = Math.abs(anomalyNt)
  let level: MagneticMineralization["level"]
  let label: string
  if (a < 50) {
    level = "low"
    label = "Χαμηλή ορυκτοποίηση — καθαρό έδαφος"
  } else if (a < 150) {
    level = "moderate"
    label = "Μέτρια ορυκτοποίηση"
  } else if (a < 350) {
    level = "high"
    label = "Υψηλή ορυκτοποίηση — θορυβώδες έδαφος"
  } else {
    level = "extreme"
    label = "Πολύ υψηλή ορυκτοποίηση — έντονος θόρυβος"
  }
  // Κορεσμός σε ~500 nT για τον δείκτη θορύβου.
  const noiseIndex = Math.max(0, Math.min(1, a / 500))
  return { anomalyNt, level, label, noiseIndex }
}

/* ============================================================
   ΓΡΗΓΟΡΕΣ ΠΡΟΕΠΙΛΟΓΕΣ (Presets)
   Συνδυασμοί υλικού-στόχου + εδάφους (skin depth) + εδάφους
   διάθλασης, για γρήγορη ρύθμιση τυπικών σεναρίων πεδίου.
============================================================ */
export interface Preset {
  id: string
  label: string
  desc: string
  materialId: string
  /** τιμή για το select του section 3 (σ σε S/m ως string) */
  soilType: string
  /** τιμή για το select του section 6 (ε_r|σ) */
  sec6Soil: string
}

export const PRESETS: Preset[] = [
  {
    id: "au-dry",
    label: "Χρυσός · ξηρό χωράφι",
    desc: "¹⁹⁷Au σε ξηρό/αμμώδες έδαφος — μέγιστη διείσδυση",
    materialId: "au197",
    soilType: "0.001",
    sec6Soil: "4|0.001",
  },
  {
    id: "au-wet",
    label: "Χρυσός · υγρό/αργιλώδες",
    desc: "¹⁹⁷Au σε υγρό αργιλώδες — έντονη εξασθένηση",
    materialId: "au197",
    soilType: "0.05",
    sec6Soil: "25|0.05",
  },
  {
    id: "ag-medium",
    label: "Άργυρος · μέτριο έδαφος",
    desc: "¹⁰⁹Ag σε μέτριο/μικτό έδαφος",
    materialId: "ag109",
    soilType: "0.01",
    sec6Soil: "10|0.01",
  },
  {
    id: "cu-medium",
    label: "Χαλκός · μέτριο έδαφος",
    desc: "⁶³Cu σε μέτριο/μικτό έδαφος",
    materialId: "cu63",
    soilType: "0.01",
    sec6Soil: "10|0.01",
  },
  {
    id: "fe-wet",
    label: "Σίδηρος · υγρό έδαφος",
    desc: "⁵⁷Fe (σιδηρομαγνητικό) σε υγρό έδαφος",
    materialId: "fe57",
    soilType: "0.05",
    sec6Soil: "25|0.05",
  },
]

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}

/* ============================================================
   VALIDATION — έλεγχος έγκυρων τιμών εισόδου
   Επιστρέφει μήνυμα σφάλματος (string) ή null όταν η τιμή είναι OK.
============================================================ */
export function validateLat(v: number): string | null {
  if (!Number.isFinite(v)) return "Απαιτείται αριθμός."
  if (v < -90 || v > 90) return "Εκτός ορίων (−90° … +90°)."
  return null
}

export function validateLon(v: number): string | null {
  if (!Number.isFinite(v)) return "Απαιτείται αριθμός."
  if (v < -180 || v > 180) return "Εκτός ορίων (−180° … +180°)."
  return null
}

export function validateBField(v: number): string | null {
  if (!Number.isFinite(v)) return "Απαιτείται αριθμός."
  if (v <= 0) return "Το πεδίο πρέπει να είναι θετικό."
  if (v > 100) return "Μη ρεαλιστικά υψηλό (>100 µT)."
  if (v < 20 || v > 70) return "Ασυνήθιστο για γήινο πεδίο (τυπικά 25–65 µT)."
  return null
}

export function validateDepth(v: number): string | null {
  if (!Number.isFinite(v)) return "Απαιτείται αριθμός."
  if (v < 0) return "Το βάθος δεν μπορεί να είναι αρνητικό."
  if (v > 50) return "Μη ρεαλιστικά μεγάλο βάθος (>50 m)."
  return null
}

export function validateSigma(v: number): string | null {
  if (!Number.isFinite(v)) return "Απαιτείται αριθμός."
  if (v <= 0) return "Η αγωγιμότητα πρέπει να είναι θετική."
  if (v > 10) return "Μη ρεαλιστικά υψηλή (>10 S/m)."
  return null
}

/* ============================================================
   ΔΕΙΚΤΕΣ ΠΟΙΟΤΗΤΑΣ ΜΕΤΡΗΣΗΣ (Measurement Quality)
   Αντικαθιστά το παλιό ��υριστικό "confidence %" (72 − απόσταση…)
   με έναν διαφανή σύνθετο δείκτη από σαφείς, φυσικά θεμελιωμένους
   παράγοντες. Κάθε παράγοντας βαθμολογείται 0..1 και σταθμίζεται.
============================================================ */
export type QualityStatus = "good" | "warn" | "bad"

export interface QualityFactor {
  key: string
  label: string
  /** 0..1 */
  score: number
  /** βάρος στο συνολικό άθροισμα */
  weight: number
  detail: string
  status: QualityStatus
}

export interface MeasurementQuality {
  /** 0..100 */
  score: number
  grade: string
  gradeStatus: QualityStatus
  factors: QualityFactor[]
}

export interface QualityInput {
  /** πηγή του πεδίου B (π.χ. "NOAA WMM-2025", "Offline dipole…", "χειροκίνητο") */
  bSource: string
  /** loss tangent του μοντέλου διάθλασης στη συχνότητα εκπομπής */
  lossTangent: number | null
  /** Ολική Εσωτερική Ανάκλαση στη διεπαφή εδάφους/αέρα */
  isTIR: boolean
  /** απόσταση γεννήτριας–παρατηρούμενου σημείου (km) */
  distanceKm: number
  /** εκτ. πλάτος σήματος στο βάθος στόχου (0..100 %) */
  signalAmplitudePct: number
  /** αν η επιλεγμένη συχνότητα προέρχεται από τη βέλτιστη ζώνη */
  frequencyIsOptimal: boolean
}

function statusFromScore(s: number): QualityStatus {
  if (s >= 0.66) return "good"
  if (s >= 0.33) return "warn"
  return "bad"
}

export function computeMeasurementQuality(input: QualityInput): MeasurementQuality {
  const factors: QualityFactor[] = []

  // 1) Ποιότητα γεωμαγνητικού πεδίου B ανά πηγή
  {
    const src = input.bSource.toLowerCase()
    let score = 0.3
    let detail = "Χειροκίνητη τιμή — μη επαληθευμένη."
    if (src.includes("noaa") || src.includes("wmm")) {
      score = 1
      detail = "Ζωντανό μοντέλο NOAA WMM."
    } else if (src.includes("dipole")) {
      score = 0.55
      detail = "Offline dipole (~10–20% σφάλμα)."
    }
    factors.push({
      key: "field",
      label: "Πηγή πεδίου B",
      score,
      weight: 0.25,
      detail,
      status: statusFromScore(score),
    })
  }

  // 2) Εγκυρότητα μοντέλου διάθλασης (καλός αγωγός/διηλεκτρ��κό: tan δ)
  {
    const lt = input.lossTangent
    let score = 0.5
    let detail = "Άγνωστο loss tangent."
    if (lt != null && Number.isFinite(lt)) {
      // tan δ ≪ 1 → το μοντέλο επίπεδου κύματος/διηλεκτρικού είναι αξιόπιστο.
      score = Math.max(0, Math.min(1, 1 - lt / 0.6))
      detail = `tan δ = ${lt.toFixed(3)} ${lt < 0.1 ? "(χαμηλών απωλειών)" : lt < 0.3 ? "(οριακό)" : "(υψηλών απωλειών)"}`
    }
    factors.push({
      key: "model",
      label: "Εγκυρότητα μοντέλου (tan δ)",
      score,
      weight: 0.2,
      detail,
      status: statusFromScore(score),
    })
  }

  // 3) Γεωμετρία διάδοσης — Ολική Εσωτερική Ανάκλαση
  {
    const score = input.isTIR ? 0 : 1
    factors.push({
      key: "geometry",
      label: "Γεωμετρία διάδοσης",
      score,
      weight: 0.15,
      detail: input.isTIR ? "ΟΕΑ — drift μη υπολογίσιμο." : "Χωρίς ολική ανάκλαση.",
      status: input.isTIR ? "bad" : "good",
    })
  }

  // 4) Ισχύς σήματος στο βάθος στόχου
  {
    const score = Math.max(0, Math.min(1, input.signalAmplitudePct / 100))
    factors.push({
      key: "signal",
      label: "Ισχύς σήματος στο βάθος",
      score,
      weight: 0.2,
      detail: `Εκτ. πλάτος ≈ ${input.signalAmplitudePct.toFixed(1)}% στο βάθος στόχου.`,
      status: statusFromScore(score),
    })
  }

  // 5) Εγγύτητα γεννήτριας–παρατηρούμενου σημείου
  {
    // Μικρότερη απόσταση = μικρότερη γεωμετρική αβεβαιότητα εντοπισμού.
    const d = Math.max(0, input.distanceKm)
    const score = Math.max(0, Math.min(1, 1 - d / 2)) // 0 km → 1, ≥2 km → 0
    factors.push({
      key: "proximity",
      label: "Εγγύτητα σημείων",
      score,
      weight: 0.1,
      detail: `Απόσταση = ${d.toFixed(3)} km.`,
      status: statusFromScore(score),
    })
  }

  // 6) Επιλογή συχνότητας εκπομπής
  {
    const score = input.frequencyIsOptimal ? 1 : 0.6
    factors.push({
      key: "frequency",
      label: "Επιλογή συχνότητας",
      score,
      weight: 0.1,
      detail: input.frequencyIsOptimal ? "Βέλτιστη ζώνη (max δ_soil·απόκριση)." : "Μη-βέλτιστη ζώνη/χειροκίνητη.",
      status: input.frequencyIsOptimal ? "good" : "warn",
    })
  }

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0)
  const weighted = factors.reduce((s, f) => s + f.score * f.weight, 0)
  const score = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0

  let grade = "Χαμηλή"
  let gradeStatus: QualityStatus = "bad"
  if (score >= 75) {
    grade = "Υψηλή"
    gradeStatus = "good"
  } else if (score >= 50) {
    grade = "Μέτρια"
    gradeStatus = "warn"
  }

  return { score, grade, gradeStatus, factors }
}

/* ============================================================
   ΤΡΙΓΩΝΙΣΜΟΣ — Σύγκλιση πολλαπλών μετρήσεων
   Από 2-3+ θέσεις γεννήτριας, καθεμιά με μια διεύθυνση (διόπτευση)
   προς τον στόχο, υπολογίζεται το σημείο τομής των διευθύνσεων με
   σταθμισμένη μέθοδο ελαχίστων τετραγώνων και εκτιμάται η «ζώνη
   αβεβαιότητας» (error ellipse 95%) γύρω από το εκτιμώμενο σημείο.

   Μέθοδος:
   - Προβολή σε τοπικό εφαπτόμενο επίπεδο ENU (equirectangular).
   - Κάθε διεύθυνση i ορίζει ευθεία με κάθετο μοναδιαίο διάνυσμα nᵢ·
     ελαχιστοποιούμε Σ wᵢ (nᵢ·(p − sᵢ))².
   - Βάρη wᵢ = 1/σ⊥ᵢ² με σ⊥ᵢ = ρᵢ·σθ (γωνιακή αβεβαιότητα × απόσταση).
   - Συνδιακύμανση C = (Σ wᵢ nᵢnᵢᵀ)⁻¹ → ιδιοτιμές → ημιάξονες έλλειψης.
   - Κλίμακα 95% (χ² 2 β.ε.): k = √5.991 ≈ 2.4477.
============================================================ */
const R_EARTH_M = 6371000

/** Σημείο προορισμού από αρχικό σημείο, διόπτευση και απόσταση (great-circle). */
export function destinationPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const R = 6371
  const d = distanceKm / R
  const br = (bearingDeg * Math.PI) / 180
  const phi1 = (lat * Math.PI) / 180
  const lam1 = (lon * Math.PI) / 180
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(br))
  const lam2 = lam1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(phi1), Math.cos(d) - Math.sin(phi1) * Math.sin(phi2))
  return [(phi2 * 180) / Math.PI, (((lam2 * 180) / Math.PI + 540) % 360) - 180]
}

export interface TriStation {
  id: string
  lat: number
  lon: number
  /** διόπτευ��η προς τον στόχο (μοίρες από Βορρά, δεξιόστροφα) */
  bearingDeg: number
}

export interface TriResult {
  ok: boolean
  reason: string | null
  /** εκτιμώμενη θέση στόχου */
  lat: number
  lon: number
  /** ημιάξονες έλλειψης 95% (m) */
  semiMajorM: number
  semiMinorM: number
  /** διόπτευση μεγάλου άξονα (μοίρες από Βορρά) */
  orientationDeg: number
  /** εμβαδόν ζώνης αβεβαιότητας 95% (m²) */
  areaM2: number
  /** RMS κάθετο υπόλοιπο (m) — πόσο καλά συγκλίνουν οι διευθύνσεις */
  rmsResidualM: number
  stationCount: number
  /** πολύγωνο έλλειψης ως [lat, lon] για χάρτη */
  ellipsePolygon: Array<[number, number]>
  /** σημεία τομής ανά ζεύγος διευθύνσεων (για οπτικοποίηση διασποράς) */
  intersections: Array<{ lat: number; lon: number }>
  angularUncertaintyDeg: number
  /** καλύτερη (πλησιέστερη στις 90°) γωνία τομής μεταξύ ζευγών διευθύνσεων */
  bestCrossAngleDeg: number
  /** συνολικός δείκτης ποιότητας γεωμετρίας 0–100 */
  qualityScore: number
  /** κατηγορία ποιότητας */
  qualityGrade: "excellent" | "good" | "fair" | "poor"
  /** επιμέρους βαθμοί (0–1) για γωνία τομής, μέγεθος έλλειψης, σύγκλιση */
  qualityParts: { angle: number; ellipse: number; convergence: number }
}

/** Αρχική διόπτευση (μοίρες από Βορρά, δεξιόστροφα) από σημείο Α προς Β. */
export function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const deg = Math.PI / 180
  const phi1 = lat1 * deg
  const phi2 = lat2 * deg
  const dLam = (lon2 - lon1) * deg
  const y = Math.sin(dLam) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function triangulate(stations: TriStation[], angularUncertaintyDeg = 3): TriResult | null {
  const valid = stations.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Number.isFinite(s.bearingDeg),
  )
  if (valid.length < 2) return null

  const lat0 = valid.reduce((a, v) => a + v.lat, 0) / valid.length
  const lon0 = valid.reduce((a, v) => a + v.lon, 0) / valid.length
  const cosLat0 = Math.cos((lat0 * Math.PI) / 180) || 1e-6
  const deg = Math.PI / 180

  const toLocal = (lat: number, lon: number) => ({
    x: R_EARTH_M * cosLat0 * (lon - lon0) * deg, // east (m)
    y: R_EARTH_M * (lat - lat0) * deg, // north (m)
  })
  const toLatLon = (x: number, y: number): [number, number] => [
    lat0 + y / R_EARTH_M / deg,
    lon0 + x / (R_EARTH_M * cosLat0) / deg,
  ]

  const locals = valid.map((s) => {
    const p = toLocal(s.lat, s.lon)
    const th = s.bearingDeg * deg
    return {
      x: p.x,
      y: p.y,
      dE: Math.sin(th), // διεύθυνση προς στόχο (east)
      dN: Math.cos(th), // (north)
      nE: Math.cos(th), // κάθετο στην ευθεία
      nN: -Math.sin(th),
    }
  })

  const solve = (weights: number[]) => {
    let a11 = 0,
      a12 = 0,
      a22 = 0,
      b1 = 0,
      b2 = 0
    locals.forEach((l, i) => {
      const w = weights[i]
      const c = l.nE * l.x + l.nN * l.y
      a11 += w * l.nE * l.nE
      a12 += w * l.nE * l.nN
      a22 += w * l.nN * l.nN
      b1 += w * l.nE * c
      b2 += w * l.nN * c
    })
    const det = a11 * a22 - a12 * a12
    if (Math.abs(det) < 1e-12) return null
    return {
      px: (a22 * b1 - a12 * b2) / det,
      py: (-a12 * b1 + a11 * b2) / det,
      cxx: a22 / det,
      cxy: -a12 / det,
      cyy: a11 / det,
    }
  }

  const empty = (reason: string): TriResult => ({
    ok: false,
    reason,
    lat: lat0,
    lon: lon0,
    semiMajorM: 0,
    semiMinorM: 0,
    orientationDeg: 0,
    areaM2: 0,
    rmsResidualM: 0,
    stationCount: valid.length,
    ellipsePolygon: [],
    intersections: [],
    angularUncertaintyDeg,
    bestCrossAngleDeg: 0,
    qualityScore: 0,
    qualityGrade: "poor",
    qualityParts: { angle: 0, ellipse: 0, convergence: 0 },
  })

  // Βήμα 1: αρχική εκτίμηση με ίσα βάρη
  const first = solve(locals.map(() => 1))
  if (!first) {
    return empty(
      "Οι διευθύνσεις είναι σχεδόν παράλληλες — δεν ορίζεται σαφές σημείο τομής. Μετακίνησε τις θέσεις γεννήτριας ή άλλαξε τις διοπτεύσεις.",
    )
  }

  // Βήμα 2: σταθμισμένη λύση — βάρη 1/σ⊥² με σ⊥ = ρ·σθ
  const sigThRad = Math.max(0.1, angularUncertaintyDeg) * deg
  const weights = locals.map((l) => {
    const rho = Math.hypot(first.px - l.x, first.py - l.y)
    const sigPerp = Math.max(0.5, rho * sigThRad)
    return 1 / (sigPerp * sigPerp)
  })
  const sol = solve(weights) ?? first
  const px = sol.px
  const py = sol.py

  // Υπόλοιπα (κάθετη απόσταση κάθε ευθείας από το σημείο)
  let ssr = 0
  locals.forEach((l) => {
    const r = l.nE * (px - l.x) + l.nN * (py - l.y)
    ssr += r * r
  })
  const rms = Math.sqrt(ssr / valid.length)

  // Συνδιακύμανση· κλιμάκωση με χ²/β.ε. όταν είναι υπερκαθορισμένο (>2 σταθμοί)
  let cxx = sol.cxx
  let cxy = sol.cxy
  let cyy = sol.cyy
  if (valid.length > 2) {
    let chi = 0
    locals.forEach((l, i) => {
      const r = l.nE * (px - l.x) + l.nN * (py - l.y)
      chi += weights[i] * r * r
    })
    const scale = chi / (valid.length - 2)
    if (Number.isFinite(scale) && scale > 0) {
      cxx *= scale
      cxy *= scale
      cyy *= scale
    }
  }

  // Ιδιοανάλυση της 2×2 συμμετρικής C
  const tr = cxx + cyy
  const det2 = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det2))
  const l1 = tr / 2 + disc
  const l2 = Math.max(0, tr / 2 - disc)
  let vx: number
  let vy: number
  if (Math.abs(cxy) > 1e-12) {
    vx = l1 - cyy
    vy = cxy
  } else {
    vx = cxx >= cyy ? 1 : 0
    vy = cxx >= cyy ? 0 : 1
  }
  const vnorm = Math.hypot(vx, vy) || 1
  vx /= vnorm
  vy /= vnorm
  const phi = Math.atan2(vy, vx) // γωνία μεγάλου άξονα στο ENU (από east, ccw)

  const k95 = Math.sqrt(5.991) // 95% CI, 2 β.ε.
  const semiMajor = k95 * Math.sqrt(l1)
  const semiMinor = k95 * Math.sqrt(l2)

  // Πολύγωνο έλλειψης
  const N = 48
  const poly: Array<[number, number]> = []
  for (let k = 0; k <= N; k++) {
    const t = (2 * Math.PI * k) / N
    const ex = semiMajor * Math.cos(t)
    const ey = semiMinor * Math.sin(t)
    const x = px + ex * Math.cos(phi) - ey * Math.sin(phi)
    const y = py + ex * Math.sin(phi) + ey * Math.cos(phi)
    poly.push(toLatLon(x, y))
  }

  // Σημεία τομής ανά ζεύγος
  const inter: Array<{ lat: number; lon: number }> = []
  for (let i = 0; i < locals.length; i++) {
    for (let j = i + 1; j < locals.length; j++) {
      const A = locals[i]
      const B = locals[j]
      const det = -A.dE * B.dN + B.dE * A.dN
      if (Math.abs(det) < 1e-9) continue
      const rx = B.x - A.x
      const ry = B.y - A.y
      const tA = (-rx * B.dN + B.dE * ry) / det
      const [la, lo] = toLatLon(A.x + tA * A.dE, A.y + tA * A.dN)
      inter.push({ lat: la, lon: lo })
    }
  }

  const [elat, elon] = toLatLon(px, py)
  const orientationDeg = (((90 - (phi * 180) / Math.PI) % 360) + 360) % 360

  // ── Δείκτης ποιότητας γεωμετρίας ────────────────────────��────
  // Καλύτερη γωνία τομής μεταξύ όλων των ζευγών (πλησιέστερη στις 90°).
  let bestCross = 0
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      let diff = Math.abs(valid[i].bearingDeg - valid[j].bearingDeg) % 180
      const acute = Math.min(diff, 180 - diff) // 0..90
      if (acute > bestCross) bestCross = acute
    }
  }
  // Επιμέρους βαθμοί 0..1
  const angleScore = Math.sin((bestCross * Math.PI) / 180) // 1 στις 90°, 0 σε παράλληλες
  const ellipseScore = 1 / (1 + semiMajor / 50) // 0.5 στα 50 m ημιάξονα
  const convergenceScore = 1 / (1 + rms / 5) // 0.5 στα 5 m RMS
  const qualityScore = Math.round(100 * (0.45 * angleScore + 0.3 * ellipseScore + 0.25 * convergenceScore))
  const qualityGrade: TriResult["qualityGrade"] =
    qualityScore >= 80 ? "excellent" : qualityScore >= 60 ? "good" : qualityScore >= 40 ? "fair" : "poor"

  return {
    ok: true,
    reason: null,
    lat: elat,
    lon: elon,
    semiMajorM: semiMajor,
    semiMinorM: semiMinor,
    orientationDeg,
    areaM2: Math.PI * semiMajor * semiMinor,
    rmsResidualM: rms,
    stationCount: valid.length,
    ellipsePolygon: poly,
    intersections: inter,
    angularUncertaintyDeg,
    bestCrossAngleDeg: bestCross,
    qualityScore,
    qualityGrade,
    qualityParts: { angle: angleScore, ellipse: ellipseScore, convergence: convergenceScore },
  }
}
