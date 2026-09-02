"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  ChevronDown,
  Compass,
  Gauge,
  HelpCircle,
  MousePointerClick,
  Move,
  Plus,
  Target,
  Trash2,
} from "lucide-react"
import { Panel, Field, Readout, inputClass, buttonClass } from "./primitives"
import { triangulate, validateLat, validateLon, type TriResult, type TriStation } from "@/lib/physics"

const TriangulationMap = dynamic(() => import("./triangulation-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
      Φόρτωση χάρτη…
    </div>
  ),
})

let seq = 0
const mkId = () => `st_${Date.now()}_${seq++}`

function fmtEllipseAxis(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—"
  if (m < 1000) return m.toFixed(1) + " m"
  return (m / 1000).toFixed(2) + " km"
}

function fmtArea(m2: number): string {
  if (!Number.isFinite(m2) || m2 <= 0) return "—"
  if (m2 < 10000) return m2.toFixed(0) + " m²"
  return (m2 / 1e6).toFixed(3) + " km²"
}

/* ── Δείκτης ποιότητας γεωμετρίας ───────────────────────────── */
const GRADE_META: Record<
  TriResult["qualityGrade"],
  { label: string; color: string; bar: string; ring: string }
> = {
  excellent: { label: "Άριστη", color: "var(--phosphor)", bar: "var(--phosphor)", ring: "var(--phosphor)" },
  good: { label: "Καλή", color: "var(--phosphor)", bar: "var(--phosphor)", ring: "var(--phosphor)" },
  fair: { label: "Μέτρια", color: "var(--brass)", bar: "var(--brass)", ring: "var(--brass)" },
  poor: { label: "Χαμηλή", color: "var(--destructive)", bar: "var(--destructive)", ring: "var(--destructive)" },
}

function QualityBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const color = pct >= 66 ? "var(--phosphor)" : pct >= 40 ? "var(--brass)" : "var(--destructive)"
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[0.66rem] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-[0.66rem]" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-line">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 font-mono text-[0.6rem] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

function QualityIndex({ result }: { result: TriResult }) {
  const meta = GRADE_META[result.qualityGrade]
  const score = result.qualityScore
  const circumference = 2 * Math.PI * 26
  const dash = (score / 100) * circumference
  return (
    <div className="mt-4 rounded-sm border border-panel-line bg-readout p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="size-4 text-brass" />
        <h3 className="font-display text-sm font-bold text-foreground">Δείκτης ποιότητας γεωμετρίας</h3>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Κυκλικός μετρητής */}
        <div className="relative mx-auto shrink-0 sm:mx-0" style={{ width: 68, height: 68 }}>
          <svg width={68} height={68} viewBox="0 0 68 68" role="img" aria-label={`Ποιότητα ${score} στα 100`}>
            <circle cx={34} cy={34} r={26} fill="none" stroke="var(--panel-line)" strokeWidth={6} />
            <circle
              cx={34}
              cy={34}
              r={26}
              fill="none"
              stroke={meta.ring}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 34 34)"
              style={{ transition: "stroke-dasharray 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: meta.color }}>
              {score}
            </span>
            <span className="font-mono text-[0.55rem] text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] font-bold"
            style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)`, color: meta.color }}
          >
            {meta.label} αξιοπιστία τομής
          </span>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <QualityBar
              label="Γωνία τομής"
              value={result.qualityParts.angle}
              hint={`βέλτιστη ${result.bestCrossAngleDeg.toFixed(0)}° (ιδανικό 90°)`}
            />
            <QualityBar
              label="Μέγεθος ζώνης"
              value={result.qualityParts.ellipse}
              hint={`ημιάξονας ${fmtEllipseAxis(result.semiMajorM)}`}
            />
            <QualityBar
              label="Σύγκλιση"
              value={result.qualityParts.convergence}
              hint={`RMS ${result.rmsResidualM.toFixed(1)} m`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Καθοδηγητικά βήματα ────────────────────────────────────── */
const STEPS = [
  {
    icon: Target,
    title: "Κατέγραψε θέσεις",
    body: "Πάτησε «Καταγραφή τρέχουσας μέτρησης» για να περάσεις τη γεννήτρια και τη διόπτευση από το §7, ή κάνε κλικ πάνω στον χάρτη για να προσθέσεις θέση.",
  },
  {
    icon: Compass,
    title: "Ρύθμισε τη διόπτευση",
    body: "Σε κάθε θέση δώσε τη γωνία που δείχνουν οι βέργες προς τον στόχο. Μπορείς να σύρεις τη λαβή στην άκρη της ακτίνας πάνω στον χάρτη.",
  },
  {
    icon: Move,
    title: "Διόρθωσε στον χάρτη",
    body: "Σύρε τους αριθμημένους δείκτες για να μετακινήσεις μια θέση. Χρειάζονται τουλάχιστον 2 διευθύνσεις για τομή.",
  },
  {
    icon: Gauge,
    title: "Διάβασε το αποτέλεσμα",
    body: "Ο εκτιμώμενος στόχος, η ζώνη αβεβαιότητας 95% και ο δείκτης ποιότητας σου δείχνουν πόσο αξιόπιστη είναι η τομή.",
  },
]

export function TriangulationPanel({
  currentGenerator,
  currentBearing,
}: {
  currentGenerator: { lat: number; lon: number }
  currentBearing: number
}) {
  const KEY = "larmor-triangulation-v1"
  const [stations, setStations] = useState<TriStation[]>([])
  const [angUnc, setAngUnc] = useState(3)
  const [showHelp, setShowHelp] = useState(false)
  const restored = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (Array.isArray(s.stations)) setStations(s.stations)
        if (Number.isFinite(s.angUnc)) setAngUnc(s.angUnc)
      }
    } catch (e) {
      console.warn("[v0] Triangulation restore failed:", e)
    }
    restored.current = true
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify({ stations, angUnc }))
    } catch (e) {
      console.warn("[v0] Triangulation save failed:", e)
    }
  }, [stations, angUnc])

  const result = useMemo(() => triangulate(stations, angUnc), [stations, angUnc])
  const validCount = stations.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Number.isFinite(s.bearingDeg),
  ).length

  // Κατάσταση καθοδήγησης
  const status =
    validCount === 0
      ? { text: "Πρόσθεσε τουλάχιστον 2 διευθύνσεις για να ξεκινήσει η τομή.", tone: "muted" as const }
      : validCount === 1
        ? { text: "Χρειάζεται 1 ακόμη διεύθυνση για να οριστεί σημείο τομής.", tone: "brass" as const }
        : result?.ok
          ? { text: `${validCount} διευθύνσεις συγκλίνουν — δες το αποτέλεσμα παρακάτω.`, tone: "phosphor" as const }
          : { text: "Οι διευθύνσεις δεν τέμνονται καθαρά — δοκίμασε άλλη γεωμετρία.", tone: "brass" as const }

  function addCurrent() {
    setStations((prev) => [
      ...prev,
      {
        id: mkId(),
        lat: Number((currentGenerator.lat ?? 0).toFixed(6)),
        lon: Number((currentGenerator.lon ?? 0).toFixed(6)),
        bearingDeg: Number((currentBearing || 0).toFixed(1)),
      },
    ])
  }

  function addEmpty() {
    setStations((prev) => [
      ...prev,
      {
        id: mkId(),
        lat: Number((currentGenerator.lat ?? 37.9838).toFixed(6)),
        lon: Number((currentGenerator.lon ?? 23.7275).toFixed(6)),
        bearingDeg: 0,
      },
    ])
  }

  function addAt(lat: number, lon: number) {
    setStations((prev) => [
      ...prev,
      { id: mkId(), lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)), bearingDeg: Number((currentBearing || 0).toFixed(1)) },
    ])
  }

  function update(id: string, patch: Partial<TriStation>) {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: string) {
    setStations((prev) => prev.filter((s) => s.id !== id))
  }

  const statusTone =
    status.tone === "phosphor" ? "text-phosphor" : status.tone === "brass" ? "text-brass" : "text-muted-foreground"

  return (
    <Panel
      step="8"
      className="order-last"
      title="Τριγωνισμός · Σύγκλιση πολλαπλών μετρήσεων"
      desc="Κατέγραψε 2-3 (ή περισσότερες) θέσεις γεννήτριας, καθεμιά με τη διόπτευση που δείχνουν οι βέργες προς τον στόχο. Το σημείο τομής των διευθύνσεων υπολογίζεται αυτόματα με σταθμισμένα ελάχιστα τετράγωνα, μαζί με τη «ζώνη αβεβαιότητας» (error ellipse 95%) γύρω του."
    >
      {/* Καθοδήγηση (αναδιπλούμενη) */}
      <div className="mb-4 overflow-hidden rounded-sm border border-brass-dim/50 bg-secondary/25">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-mono text-[0.72rem] text-phosphor transition-colors hover:bg-secondary/40"
          aria-expanded={showHelp}
          onClick={() => setShowHelp((v) => !v)}
        >
          <HelpCircle className="size-4 shrink-0 text-brass" />
          <span className="font-bold">Πώς λειτουργεί ο τριγωνισμός</span>
          <ChevronDown
            className={`ml-auto size-4 shrink-0 transition-transform ${showHelp ? "rotate-180" : ""}`}
          />
        </button>
        {showHelp && (
          <ol className="grid gap-2.5 border-t border-brass-dim/40 px-3.5 py-3 sm:grid-cols-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={i} className="flex gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-panel">
                    <Icon className="size-3.5 text-brass" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[0.72rem] font-bold text-foreground">
                      {i + 1}. {s.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.66rem] leading-snug text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Ενέργειες */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={addCurrent}>
          <Target className="size-4" /> Καταγραφή τρέχουσας μέτρησης
        </button>
        <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={addEmpty}>
          <Plus className="size-4" /> Προσθήκη κενής θέσης
        </button>
        {stations.length > 0 && (
          <button type="button" className={buttonClass + " flex items-center gap-2"} onClick={() => setStations([])}>
            <Trash2 className="size-4" /> Καθαρισμός όλων
          </button>
        )}
        <span className="ml-auto font-mono text-[0.68rem] text-muted-foreground">{validCount} έγκυρες διευθύνσεις</span>
      </div>

      {/* Γραμμή κατάστασης καθοδήγησης */}
      <p className={`mb-4 flex items-center gap-2 font-mono text-[0.72rem] ${statusTone}`}>
        <span
          className="inline-block size-1.5 shrink-0 rounded-full"
          style={{ background: "currentColor", boxShadow: "0 0 6px currentColor" }}
        />
        {status.text}
      </p>

      {/* Διαδραστικός χάρτης — πάντα ορατός */}
      <div className="relative mb-4 h-72 overflow-hidden rounded-sm border border-panel-line">
        <TriangulationMap
          stations={stations}
          result={result}
          onAddStation={addAt}
          onMoveStation={(id, lat, lon) => update(id, { lat, lon })}
          onSetBearing={(id, bearingDeg) => update(id, { bearingDeg })}
        />
        {validCount === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-background/90 to-transparent px-3 pb-3 pt-8">
            <MousePointerClick className="size-4 text-phosphor" />
            <span className="font-mono text-[0.7rem] text-phosphor">Κάνε κλικ στον χάρτη για προσθήκη θέσης</span>
          </div>
        )}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.66rem] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: "#8dffb0" }} /> θέση γεννήτριας (σύρσιμο)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-phosphor" /> διεύθυνση · λαβή = διόπτευση
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: "#ff5c5c" }} /> εκτιμώμενος στόχος
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: "#e6b85c", opacity: 0.6 }} /> ζώνη 95%
        </span>
      </div>

      <div className="mb-4 max-w-xs">
        <Field label="Γωνιακή αβεβαιότητα διόπτευσης σθ (°)" htmlFor="ang-unc">
          <input
            id="ang-unc"
            type="number"
            step="0.5"
            min={0.1}
            max={30}
            className={inputClass}
            value={angUnc}
            onChange={(e) => setAngUnc(Math.max(0.1, Math.min(30, Number.parseFloat(e.target.value) || 3)))}
          />
          <span className="mt-1 block font-mono text-[0.6rem] text-muted-foreground">
            καθορίζει το μέγεθος της ζώνης αβεβαιότητας (τυπικά 2–5° για βέργες)
          </span>
        </Field>
      </div>

      {/* Λίστα σταθμών */}
      {stations.length === 0 ? (
        <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
          Δεν έχουν καταγραφεί θέσεις. Πάτησε «Καταγραφή τρέχουσας μέτρησης», «Προσθήκη κενής θέσης», ή κάνε κλικ στον
          χάρτη. Χρειάζονται τουλάχιστον 2 διευθύνσεις.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {stations.map((s, idx) => (
            <div
              key={s.id}
              className="grid grid-cols-1 gap-3 rounded-sm border border-panel-line bg-readout p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end"
            >
              <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-phosphor-dim font-mono text-xs font-bold text-background">
                {idx + 1}
              </span>
              <Field label="Πλάτος γεννήτριας" htmlFor={`tri-lat-${s.id}`} warn={validateLat(s.lat)}>
                <input
                  id={`tri-lat-${s.id}`}
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  className={inputClass}
                  value={Number.isFinite(s.lat) ? s.lat : ""}
                  onChange={(e) => update(s.id, { lat: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <Field label="Μήκος γεννήτριας" htmlFor={`tri-lon-${s.id}`} warn={validateLon(s.lon)}>
                <input
                  id={`tri-lon-${s.id}`}
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  className={inputClass}
                  value={Number.isFinite(s.lon) ? s.lon : ""}
                  onChange={(e) => update(s.id, { lon: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <Field label="Διόπτευση προς στόχο (°)" htmlFor={`tri-brg-${s.id}`}>
                <input
                  id={`tri-brg-${s.id}`}
                  type="number"
                  step="0.1"
                  min={0}
                  max={360}
                  className={inputClass}
                  value={Number.isFinite(s.bearingDeg) ? s.bearingDeg : ""}
                  onChange={(e) => update(s.id, { bearingDeg: Number.parseFloat(e.target.value) })}
                />
              </Field>
              <button
                type="button"
                aria-label={`Διαγραφή θέσης ${idx + 1}`}
                className="flex items-center justify-center gap-1.5 self-center rounded-sm border border-panel-line px-2.5 py-2 font-mono text-[0.7rem] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="size-3.5" /> <span className="sm:hidden">Διαγραφή</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Αποτέλεσμα */}
      {result && !result.ok && (
        <div
          className="mt-4 rounded-sm border px-3.5 py-3 font-mono text-[0.76rem] leading-relaxed"
          style={{ borderColor: "var(--destructive)", background: "oklch(0.3 0.05 35 / 0.15)", color: "var(--destructive)" }}
        >
          ⚠ {result.reason}
        </div>
      )}

      {result?.ok && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Readout label="Εκτιμώμενος στόχος (τομή)" value={`${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`} tone="phosphor" />
            <Readout label="Ζώνη αβεβαιότητας 95%" value={fmtArea(result.areaM2)} tone="brass" />
            <Readout
              label="Σύγκλιση διευθύνσεων (RMS)"
              value={result.rmsResidualM.toFixed(2)}
              unit="m"
              tone={result.rmsResidualM < 5 ? "phosphor" : "brass"}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Readout label="Μεγάλος ημιάξονας" value={fmtEllipseAxis(result.semiMajorM)} tone="muted" />
            <Readout label="Μικρός ημιάξονας" value={fmtEllipseAxis(result.semiMinorM)} tone="muted" />
            <Readout label="Προσανατολισμός άξονα" value={result.orientationDeg.toFixed(0)} unit="°" tone="muted" />
          </div>

          {/* Δείκτης ποιότητας γεωμετρίας */}
          <QualityIndex result={result} />

          <p className="mt-3 rounded-sm border border-brass-dim/50 bg-secondary/30 px-3 py-2.5 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
            Η ακρίβεια πολλαπλασιάζεται με τον συνδυασμό μετρήσεων: το σημείο τομής προκύπτει από σταθμισμένα ελάχιστα
            τετράγωνα όλων των διευθύνσεων, ενώ η έλλειψη 95% αποτυπώνει τη γεωμετρική αβεβαιότητα. Μικρό RMS και μικρή
            έλλειψη → πιο αξιόπιστη εκτίμηση. Καλύτερη γεωμετρία επιτυγχάνεται όταν οι διευθύνσεις τέμνονται κοντά στις 90°.
          </p>
        </>
      )}
    </Panel>
  )
}
