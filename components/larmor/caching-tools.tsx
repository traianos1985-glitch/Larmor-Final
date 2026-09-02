"use client"

import { useMemo, useState } from "react"
import { Panel, Field, Readout, inputClass, selectClass } from "./primitives"
import { destinationPoint, distanceAndBearingKm, validateLat, validateLon } from "@/lib/physics"
import { CacheReport, SiteSelector, PackagingPlanner, RecoveryPlanner } from "./caching-planners"

/**
 * §10 — Εργαλεία εντοπισμού & δόγμα κρύπτης.
 *
 * Επέκταση της §9 με τέσσερα εργαλεία που μεταφράζουν άμεσα το δόγμα του
 * εγχειριδίου «U.S. Army Special Forces Caching Techniques» σε πρακτικά
 * εργαλεία πεδίου:
 *   1. Αντίστροφος εντοπισμός από σημεία αναφοράς (§1-5d Pinpointing).
 *   2. Ενδείξεις διαταραγμένου εδάφους — checklist εντοπισμού (§3/§4).
 *   3. Πιθανό βάθος & μέγεθος κρύπτης (§3-1 Dimensions of the Hole).
 *   4. Οδηγός υποβρύχιας απόκρυψης (§1-4e / §3-2 Submersion).
 */

type ToolId = "reverse" | "disturbed" | "size" | "submersion" | "report" | "siteselect" | "packaging" | "recovery"

const TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: "reverse", label: "Αντίστροφος εντοπισμός", hint: "§1-5 · σημεία αναφοράς" },
  { id: "disturbed", label: "Ενδείξεις εδάφους", hint: "§3 · §4 · checklist" },
  { id: "size", label: "Βάθος & μέγεθος", hint: "§3-1 · διαστάσεις λάκκου" },
  { id: "submersion", label: "Υποβρύχια απόκρυψη", hint: "§3-2 · μέθοδος βύθισης" },
  { id: "report", label: "Αναφορά 12 σημείων", hint: "Παράρτημα Α · cache report" },
  { id: "siteselect", label: "Επιλογή θέσης", hint: "§1-4 · κριτήρια & κατάταξη" },
  { id: "packaging", label: "Συσκευασία & υγρασία", hint: "Κεφ. 2 · packaging" },
  { id: "recovery", label: "Σχεδιασμός ανάκτησης", hint: "Κεφ. 4 · recovery" },
]

// ───────────────────────── Tool 1: Αντίστροφος εντοπισμός ─────────────────────────

interface FRP {
  id: string
  label: string
  lat: number
  lon: number
  azimuth: number
  distance: number // meters
}

function ReverseLocator({
  targetLat,
  targetLon,
}: {
  targetLat: number
  targetLon: number
}) {
  const [frps, setFrps] = useState<FRP[]>([
    { id: "a", label: "Σημείο αναφοράς Α", lat: 37.9838, lon: 23.7275, azimuth: 90, distance: 8 },
  ])

  function update(id: string, patch: Partial<FRP>) {
    setFrps((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function addFrp() {
    setFrps((prev) =>
      prev.length >= 2
        ? prev
        : [
            ...prev,
            { id: "b", label: "Σημείο αναφοράς Β", lat: targetLat, lon: targetLon, azimuth: 0, distance: 8 },
          ],
    )
  }

  function removeFrp(id: string) {
    setFrps((prev) => prev.filter((f) => f.id !== id))
  }

  // Κάθε FRP προβάλλει το σημείο σκαψίματος μέσω αζιμουθίου + απόστασης (§1-5d).
  const projections = useMemo(
    () =>
      frps
        .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lon))
        .map((f) => {
          const [lat, lon] = destinationPoint(f.lat, f.lon, f.azimuth, f.distance / 1000)
          return { frp: f, lat, lon }
        }),
    [frps],
  )

  // Αν υπάρχουν 2 προβολές, ο έλεγχος συνέπειας = απόσταση μεταξύ τους (πρέπει να συμπίπτουν).
  const consistency = useMemo(() => {
    if (projections.length < 2) return null
    const { distanceKm } = distanceAndBearingKm(
      projections[0].lat,
      projections[0].lon,
      projections[1].lat,
      projections[1].lon,
    )
    const midLat = (projections[0].lat + projections[1].lat) / 2
    const midLon = (projections[0].lon + projections[1].lon) / 2
    // Βασική γραμμή = απόσταση μεταξύ των δύο FRP (κανόνας 2× baseline).
    const base = distanceAndBearingKm(frps[0].lat, frps[0].lon, frps[1].lat, frps[1].lon).distanceKm * 1000
    const maxLine = Math.max(frps[0].distance, frps[1].distance)
    return { separationM: distanceKm * 1000, midLat, midLon, baseM: base, maxLine }
  }, [projections, frps])

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Αν ο κρύπτης σημάδεψε τη θέση με σταθερά ορόσημα (FRP) + μετρημένη απόσταση/αζιμούθιο, δώσε τα σημεία αναφοράς
        και υπολόγισε αντίστροφα το σημείο σκαψίματος. Με <span className="text-brass">δύο</span> σημεία αναφοράς οι δύο
        προβολές πρέπει να συμπίπτουν — η μεταξύ τους απόκλιση δείχνει την ποιότητα του εντοπισμού.
      </p>

      {frps.map((f) => (
        <div key={f.id} className="rounded-sm border border-panel-line bg-readout p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[0.74rem] font-semibold text-brass">{f.label}</span>
            {frps.length > 1 && (
              <button
                type="button"
                className="font-mono text-[0.66rem] text-muted-foreground transition-colors hover:text-destructive"
                onClick={() => removeFrp(f.id)}
              >
                Διαγραφή
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Πλάτος" htmlFor={`rl-lat-${f.id}`} warn={validateLat(f.lat)}>
              <input
                id={`rl-lat-${f.id}`}
                type="number"
                step="0.000001"
                className={inputClass}
                value={Number.isFinite(f.lat) ? f.lat : ""}
                onChange={(e) => update(f.id, { lat: Number.parseFloat(e.target.value) })}
              />
            </Field>
            <Field label="Μήκος" htmlFor={`rl-lon-${f.id}`} warn={validateLon(f.lon)}>
              <input
                id={`rl-lon-${f.id}`}
                type="number"
                step="0.000001"
                className={inputClass}
                value={Number.isFinite(f.lon) ? f.lon : ""}
                onChange={(e) => update(f.id, { lon: Number.parseFloat(e.target.value) })}
              />
            </Field>
            <Field label="Αζιμούθιο (°)" htmlFor={`rl-az-${f.id}`}>
              <input
                id={`rl-az-${f.id}`}
                type="number"
                step="1"
                min={0}
                max={360}
                className={inputClass}
                value={Number.isFinite(f.azimuth) ? f.azimuth : ""}
                onChange={(e) => update(f.id, { azimuth: Number.parseFloat(e.target.value) })}
              />
            </Field>
            <Field label="Απόσταση (m)" htmlFor={`rl-d-${f.id}`}>
              <input
                id={`rl-d-${f.id}`}
                type="number"
                step="0.5"
                min={0}
                className={inputClass}
                value={Number.isFinite(f.distance) ? f.distance : ""}
                onChange={(e) => update(f.id, { distance: Number.parseFloat(e.target.value) })}
              />
            </Field>
          </div>
          {f.distance > 50 && (
            <p className="mt-2 font-mono text-[0.64rem] leading-relaxed text-destructive">
              ⚠ Πάνω από 50 m η προβολή γίνεται αναξιόπιστη (μικρά σφάλματα αζιμουθίου μεγεθύνονται — §1-5d).
            </p>
          )}
          {f.distance > 10 && f.distance <= 50 && (
            <p className="mt-2 font-mono text-[0.64rem] leading-relaxed text-brass">
              Σημείωση: για εντοπισμό με πυξίδα το εγχειρίδιο συνιστά ≤ 10 m από το ορόσημο.
            </p>
          )}
        </div>
      ))}

      {frps.length < 2 && (
        <button
          type="button"
          className="self-start rounded-sm border border-brass-dim px-3 py-2 font-mono text-[0.72rem] text-phosphor transition-colors hover:border-brass"
          onClick={addFrp}
        >
          + Προσθήκη 2ου σημείου αναφοράς (τομή μετρημένων γραμμών)
        </button>
      )}

      {projections.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {projections.map((p, i) => (
            <Readout
              key={p.frp.id}
              label={`Προβολή από ${p.frp.label}`}
              value={`${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`}
              tone={i === 0 ? "phosphor" : "brass"}
            />
          ))}
        </div>
      )}

      {consistency && (
        <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Readout label="Απόκλιση δύο προβολών" value={consistency.separationM.toFixed(2)} unit="m" tone={consistency.separationM < 2 ? "phosphor" : "brass"} />
            <Readout label="Μέσο σημείο (τελική εκτίμηση)" value={`${consistency.midLat.toFixed(6)}, ${consistency.midLon.toFixed(6)}`} tone="muted" />
          </div>
          <p className="mt-2.5 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
            Κανόνας ακρίβειας (§1-5d): καμία προβαλλόμενη γραμμή δεν πρέπει να ξεπερνά το{" "}
            <span className="text-foreground">2× της βασικής γραμμής</span> μεταξύ των δύο σημείων αναφοράς (
            {consistency.baseM.toFixed(1)} m → όριο {(consistency.baseM * 2).toFixed(1)} m).{" "}
            {consistency.maxLine > consistency.baseM * 2 ? (
              <span className="text-destructive">Η μεγαλύτερη γραμμή ({consistency.maxLine.toFixed(1)} m) υπερβαίνει το όριο.</span>
            ) : (
              <span className="text-phosphor">Εντός ορίου.</span>
            )}
          </p>
        </div>
      )}

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.64rem] leading-relaxed text-muted-foreground">
        Το §7 εκτιμά τον στόχο στο <span className="text-foreground">{targetLat.toFixed(5)}, {targetLon.toFixed(5)}</span>.
        Διασταύρωσε την αντίστροφη προβολή με αυτή τη θέση — αν συμπίπτουν, ο εντοπισμός ενισχύεται.
      </p>
    </div>
  )
}

// ───────────────────────── Tool 2: Ενδείξεις διαταραγμένου εδάφους ─────────────────────────

const DISTURBED_SIGNS: { id: string; label: string; hint: string; weight: number }[] = [
  { id: "settling", label: "Καθίζηση / βύθισμα εδάφους", hint: "ο μπαζωμένος λάκκος καθιζάνει με τον καιρό", weight: 2 },
  { id: "mound", label: "Εξόγκωμα ή σωρός περίσσειας χώματος", hint: "υλικό που δεν χώρεσε πίσω στον λάκκο", weight: 2 },
  { id: "vegetation", label: "Διαφορετική / νεότερη βλάστηση", hint: "πιο πράσινη, ξερή ή αραιή πάνω από το σημείο", weight: 2 },
  { id: "soilcolor", label: "Αταίριαστο χρώμα / υφή χώματος", hint: "υπέδαφος αναμεμειγμένο στην επιφάνεια", weight: 2 },
  { id: "litter", label: "Αναδιαταγμένη φυλλωσιά / πέτρες", hint: "τεχνητά τακτοποιημένη κάλυψη", weight: 1 },
  { id: "tools", label: "Ίχνη εργαλείων ή πατήματα", hint: "μονοπάτι, λακκούβες, σημάδια φτυαριού", weight: 1 },
  { id: "hollow", label: "Κούφιος ήχος σε τοίχο / δάπεδο", hint: "χτύπημα αποκαλύπτει κοιλότητα", weight: 2 },
  { id: "plaster", label: "Φρέσκος / αταίριαστος σοβάς ή κονίαμα", hint: "πρόσφατη επιδιόρθωση σε παλιά κατασκευή", weight: 2 },
  { id: "loose", label: "Χαλαρές πέτρες ή τούβλα", hint: "μετακινημένα, εύκολα αφαιρούμενα στοιχεία", weight: 1 },
  { id: "newmaterial", label: "Νεότερο υλικό σε παλιά δομή", hint: "ασυμβατότητα ηλικίας υλικών", weight: 1 },
]

function DisturbedGround() {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { score, maxScore } = useMemo(() => {
    let s = 0
    let max = 0
    for (const sign of DISTURBED_SIGNS) {
      max += sign.weight
      if (checked.has(sign.id)) s += sign.weight
    }
    return { score: s, maxScore: max }
  }, [checked])

  const pct = Math.round((score / maxScore) * 100)
  const level =
    score === 0
      ? { text: "Καμία ένδειξη ακόμη", tone: "text-muted-foreground" }
      : pct < 30
        ? { text: "Χαμηλή — πιθανώς αδιατάρακτο", tone: "text-muted-foreground" }
        : pct < 60
          ? { text: "Μέτρια — αξίζει διερεύνηση", tone: "text-brass" }
          : { text: "Υψηλή — ισχυρή ένδειξη κρύπτης", tone: "text-phosphor" }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Το εγχειρίδιο τονίζει την «αποστείρωση» του σημείου (§3) ώστε να μη φαίνεται διαταραγμένο. Αντίστροφα, ο
        ερευνητής ψάχνει ακριβώς αυτά τα σημάδια. Τσέκαρε ό,τι παρατηρείς επιτόπου:
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {DISTURBED_SIGNS.map((sign) => {
          const active = checked.has(sign.id)
          return (
            <button
              key={sign.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(sign.id)}
              className={
                "flex items-start gap-2.5 rounded-sm border px-3 py-2.5 text-left transition-colors " +
                (active
                  ? "border-brass bg-secondary/50"
                  : "border-panel-line hover:border-brass-dim")
              }
            >
              <span
                aria-hidden
                className={
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border font-mono text-[0.6rem] " +
                  (active ? "border-brass bg-brass text-primary-foreground" : "border-panel-line text-transparent")
                }
              >
                ✓
              </span>
              <span className="flex flex-col">
                <span className={"font-mono text-[0.72rem] font-semibold " + (active ? "text-phosphor" : "text-foreground")}>
                  {sign.label}
                </span>
                <span className="font-mono text-[0.62rem] leading-relaxed text-muted-foreground">{sign.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
        <div className="flex items-center justify-between font-mono text-[0.74rem]">
          <span className="text-muted-foreground">Ένδειξη διατάραξης</span>
          <span className={level.tone}>{level.text}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-panel-line bg-panel">
            <div
              className={"h-full transition-all " + (pct < 30 ? "bg-phosphor-dim" : pct < 60 ? "bg-brass" : "bg-phosphor")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[0.64rem] text-muted-foreground">{pct}%</span>
        </div>
      </div>

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.64rem] leading-relaxed text-muted-foreground">
        Τεχνική ανίχνευσης (§4): για ταφή, χρησιμοποίησε λεπτή ατσάλινη <span className="text-foreground">βέργα-καθετήρα (~1 cm)</span>{" "}
        με μυτερή άκρη, σπρώχνοντας & περιστρέφοντάς την σε πλέγμα γύρω από το ύποπτο σημείο, τουλάχιστον όσο βαθιά
        εκτιμάς τον λάκκο.
      </p>
    </div>
  )
}

// ───────────────────────── Tool 3: Πιθανό βάθος & μέγεθος ─────────────────────────

const IN = 2.54 // cm per inch

interface ContainerPreset {
  id: string
  label: string
  L: number
  W: number
  H: number
  note: string
}

const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: "ammo", label: "Κουτί πυρομαχικών (ammo can)", L: 30, W: 15, H: 19, note: "μικρός όγκος, όπλα/έγγραφα" },
  { id: "metalbox", label: "Μεταλλικό κουτί", L: 40, W: 30, H: 25, note: "γενικής χρήσης" },
  { id: "pipe", label: "Σωλήνας (κατακόρυφος)", L: 15, W: 15, H: 100, note: "διάμετρος ~15 cm · τυφέκια" },
  { id: "barrel", label: "Βαρέλι", L: 58, W: 58, H: 88, note: "μεγάλος όγκος εφοδίων" },
  { id: "ss40", label: "Τυπικό ανοξείδωτο 7×9×40 in", L: 9 * IN, W: 7 * IN, H: 40 * IN, note: "στάνταρ δοχείο εγχειριδίου" },
  { id: "custom", label: "Προσαρμογή…", L: 40, W: 30, H: 25, note: "δώσε δικές σου διαστάσεις" },
]

function CacheSize() {
  const [presetId, setPresetId] = useState("metalbox")
  const [dims, setDims] = useState({ L: 40, W: 30, H: 25 })
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical")

  const preset = CONTAINER_PRESETS.find((p) => p.id === presetId)!

  function applyPreset(id: string) {
    setPresetId(id)
    const p = CONTAINER_PRESETS.find((x) => x.id === id)
    if (p && id !== "custom") setDims({ L: p.L, W: p.W, H: p.H })
  }

  const result = useMemo(() => {
    const { L, W, H } = dims
    const sorted = [L, W, H].sort((a, b) => b - a)
    // Κατακόρυφη: το ύψος είναι η κατακόρυφη διάσταση. Οριζόντια: ξαπλώνει, ώστε
    // η κατακόρυφη διάσταση να είναι η μικρότερη πλευρά.
    const vExtent = orientation === "vertical" ? H : Math.min(L, W, H)
    const footL = orientation === "vertical" ? Math.max(L, W) : sorted[0]
    const footW = orientation === "vertical" ? Math.min(L, W) : sorted[1]
    // §3-1: λάκκος ~30 cm μεγαλύτερος σε μήκος & πλάτος· κάλυψη ~45 cm πάνω από το δοχείο.
    const holeL = footL + 30
    const holeW = footW + 30
    const holeDepth = vExtent + 45
    const containerVol = (L * W * H) / 1_000_000 // m³
    const holeVol = (holeL * holeW * holeDepth) / 1_000_000 // m³
    const spoilVol = containerVol // περίσσεια χώματος προς απόκρυψη ≈ όγκος δοχείου
    const probeLen = Math.ceil(holeDepth) // cm — τουλάχιστον όσο το βάθος
    return { holeL, holeW, holeDepth, containerVol, holeVol, spoilVol, probeLen }
  }, [dims, orientation])

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Βάσει του τύπου δοχείου το εγχειρίδιο (§3-1) υποδεικνύει τυπικές διαστάσεις λάκκου: ο λάκκος περίπου{" "}
        <span className="text-foreground">30 cm μεγαλύτερος</span> σε μήκος & πλάτος, με κάλυψη{" "}
        <span className="text-foreground">~45 cm χώματος</span> πάνω από το δοχείο (πιο ρηχά κινδυνεύει από διάβρωση,
        πιο βαθιά δυσκολεύει τον καθετήρα).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Τύπος δοχείου / κρύπτης" htmlFor="cs-preset">
          <select id="cs-preset" className={selectClass} value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            {CONTAINER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Προσανατολισμός ταφής" htmlFor="cs-orient">
          <select
            id="cs-orient"
            className={selectClass}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as "vertical" | "horizontal")}
          >
            <option value="vertical">Κατακόρυφη</option>
            <option value="horizontal">Οριζόντια</option>
          </select>
        </Field>
      </div>

      <p className="-mt-1 font-mono text-[0.62rem] text-muted-foreground">{preset.note}</p>

      <div className="grid grid-cols-3 gap-3">
        {(["L", "W", "H"] as const).map((k) => (
          <Field key={k} label={k === "L" ? "Μήκος (cm)" : k === "W" ? "Πλάτος (cm)" : "Ύψος (cm)"} htmlFor={`cs-${k}`}>
            <input
              id={`cs-${k}`}
              type="number"
              step="1"
              min={1}
              className={inputClass}
              value={dims[k]}
              onChange={(e) => {
                setPresetId("custom")
                setDims((d) => ({ ...d, [k]: Number.parseFloat(e.target.value) || 0 }))
              }}
            />
          </Field>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Readout label="Λάκκος · μήκος" value={result.holeL.toFixed(0)} unit="cm" tone="phosphor" />
        <Readout label="Λάκκος · πλάτος" value={result.holeW.toFixed(0)} unit="cm" tone="phosphor" />
        <Readout label="Λάκκος · βάθος" value={result.holeDepth.toFixed(0)} unit="cm" tone="brass" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Readout label="Όγκος εκσκαφής" value={result.holeVol.toFixed(3)} unit="m³" tone="muted" />
        <Readout label="Περίσσεια χώματος" value={result.spoilVol.toFixed(3)} unit="m³" tone="muted" />
        <Readout label="Ελάχ. μήκος καθετήρα" value={result.probeLen.toFixed(0)} unit="cm" tone="muted" />
      </div>

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.64rem] leading-relaxed text-muted-foreground">
        Πρακτική σημασία: ο ερευνητής ξέρει έτσ�� πόσο <span className="text-foreground">βαθιά & πλατιά</span> να ψάξει
        και τι όγκο <span className="text-foreground">διαταραγμένου εδάφους</span> να αναζητά. Το «βάθος στόχου» της §3
        είναι διαφορετική εκτίμηση (ανάκλαση σήματος) — εδώ υπολογίζεται ο γεωμετρικός λάκκος του δόγματος.
      </p>
    </div>
  )
}

// ───────────────────────── Tool 4: Υποβρύχια απόκρυψη ─────────────────────────

const MOORINGS: { title: string; desc: string; pinpoint: string }[] = [
  {
    title: "Βυθού (bottom)",
    desc: "Το δοχείο βαραίνει και αφήνεται στον βυθό. Κατάλληλο μόνο σε λείο/σταθερό βυθό ή σε νερό όχι πολύ βαθύ/κρύο/θολό για κατάδυση.",
    pinpoint: "Εντοπισμός σε ευθυγράμμιση δύο σταθερών σημείων της ακτής (π.χ. προβλήτα ↔ καμινάδα).",
  },
  {
    title: "Γραμμή προς ακτή (line-to-shore)",
    desc: "Το δοχείο αγκυρώνεται και μια γραμμή τρέχει ως ακίνητο αντικείμενο στην ακτή· το τμήμα προς την ακτή θάβεται/κρύβεται.",
    pinpoint: "Περιγραφή του σημείου πρόσδεσης στην ακτή + πορεία της γραμμής.",
  },
  {
    title: "Σημαδούρα (buoy)",
    desc: "Αγκυρωμένο δοχείο με γραμμή σε σημαδούρα/πλωτό σημάδι, δεμένη αρκετά κάτω από την επιφάνεια. Ασφαλές μόνο όσο η σημαδούρα μένει στη θέση της.",
    pinpoint: "Ταυτότητα/πρόγραμμα συντήρησης της σημαδούρας (επιθεώρηση ~κάθε 6 μήνες).",
  },
  {
    title: "Κατασκευής (structural)",
    desc: "Αγκυρωμένο δοχείο με γραμμή ανάκτησης σε στιβαρή κατασκευή μέσα στο νερό (πυλώνας γέφυρας). Η γραμμή δένεται πολύ κάτω από τη στάθμη ρηχών νερών.",
    pinpoint: "Αναφορά σε συγκεκριμένο πάσσαλο/πυλώνα (π.χ. 5ος από το δυτικό άκρο).",
  },
]

function Submersion() {
  const [sinkWeight, setSinkWeight] = useState(30) // kg μικτό βάρος για βύθιση
  const [strongCurrent, setStrongCurrent] = useState(false)

  // §3-2: επιπλέον βάρος ≥ 1/10 του μικτού βάρους βύθισης· περισσότερο σε ισχυρά ρεύματα.
  const extra = useMemo(() => {
    const base = sinkWeight * 0.1
    return strongCurrent ? base * 1.5 : base
  }, [sinkWeight, strongCurrent])

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Σπάνια & απαιτητική μέθοδος (§1-4e / §3-2): κρύψιμο σε νερό (πηγάδια, στέρνες, ρέματα, λίμνες, ακτή). Απαιτεί
        αδιάβροχο δοχείο ανθεκτικό στην πίεση και τουλάχιστον δύο έμπειρα άτομα — η ανάκτηση είναι συχνά δυσκολότερη από
        την τοποθέτηση.
      </p>

      <div>
        <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-wide text-brass">Τύποι πρόσδεσης (mooring)</p>
        <div className="grid gap-2.5">
          {MOORINGS.map((m) => (
            <div key={m.title} className="rounded-sm border border-panel-line bg-readout px-3.5 py-3">
              <span className="font-mono text-[0.76rem] font-semibold text-foreground">{m.title}</span>
              <p className="mt-1 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">{m.desc}</p>
              <p className="mt-1.5 flex gap-1.5 font-mono text-[0.64rem] leading-relaxed">
                <span className="shrink-0 uppercase tracking-wide text-brass">Εντοπισμός:</span>
                <span className="text-foreground">{m.pinpoint}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
        <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-wide text-brass">
          Κρίσιμα δεδομένα — υπολογισμός βάρους αγκύρωσης
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Μικτό βάρος για βύθιση (kg)" htmlFor="sub-w">
            <input
              id="sub-w"
              type="number"
              step="1"
              min={0}
              className={inputClass}
              value={sinkWeight}
              onChange={(e) => setSinkWeight(Number.parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Συνθήκες ρεύματος" htmlFor="sub-cur">
            <select
              id="sub-cur"
              className={selectClass}
              value={strongCurrent ? "strong" : "calm"}
              onChange={(e) => setStrongCurrent(e.target.value === "strong")}
            >
              <option value="calm">Ήρεμο / ασθενές</option>
              <option value="strong">Ισχυρό ρεύμα</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Readout
            label="Επιπλέον βάρος (≥ 1/10 μικτού)"
            value={extra.toFixed(1)}
            unit="kg"
            tone="phosphor"
          />
        </div>
        <p className="mt-2 font-mono text-[0.64rem] leading-relaxed text-muted-foreground">
          Το δοχείο πρέπει πρώτα να βαρύνει σε <span className="text-foreground">μηδενική πλευστότητα</span> (δοκιμή
          βύθισης), και μετά να προστεθεί επιπλέον βάρος ώστε να μη σέρνεται στον βυθό — τουλάχιστον το 1/10 του μικτού
          βάρους βύθισης, περισσότερο σε ισχυρά ρεύματα.
        </p>
      </div>

      <ul className="flex flex-col gap-1.5 font-mono text-[0.66rem] leading-relaxed text-muted-foreground">
        <li>
          <span className="text-brass">Πλευστότητα:</span> πολλά δοχεία επιπλέουν ακόμη & γεμάτα — έλεγξέ το με πραγματική
          δοκιμή βύθισης, ποτέ μόνο θεωρητικά.
        </li>
        <li>
          <span className="text-brass">Βάθος βύθισης:</span> όσο βαθύτερα, τόσο μεγαλύτερη η πίεση & ο κίνδυνος σύνθλιψης
          του δοχείου.
        </li>
        <li>
          <span className="text-brass">Βυθός & ρεύματα:</span> απαιτείται γνώση τύπου βυθού και ρευμάτων — δύσκολο να
          αποκτηθεί κρυφά από μη ειδικούς.
        </li>
      </ul>
    </div>
  )
}

// ───────────────────────── Panel wrapper ─────────────────────────

export function CachingToolsPanel({
  targetLat,
  targetLon,
}: {
  targetLat: number
  targetLon: number
}) {
  const [tool, setTool] = useState<ToolId>("reverse")

  return (
    <Panel
      step="10"
      title="Εργαλεία εντοπισμού & δόγμα κρύπτης"
      desc={
        <>
          Επέκταση της §9 με πρακτικά εργαλεία από το εγχειρίδιο <em>Caching Techniques</em>: αντίστροφος εντοπισμός,
          checklist εδάφους, διαστάσεις λάκκου, υποβρύχια απόκρυψη — και τα εργαλεία δόγματος: αναφορά κρύπτης 12 σημείων,
          βαθμολόγηση/κατάταξη θέσης, σχεδιαστής συσκευασίας & υγρασίας και σχεδιαστής ανάκτησης.
        </>
      }
    >
      <nav aria-label="Εργαλεία §10" className="mb-4 flex flex-wrap gap-2">
        {TOOLS.map((t) => {
          const active = tool === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => setTool(t.id)}
              className={
                "flex flex-col items-start rounded-sm border px-3 py-2 text-left transition-colors " +
                (active
                  ? "border-brass bg-secondary/50 text-phosphor"
                  : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
              }
            >
              <span className="font-mono text-[0.72rem] font-semibold">
                {active ? "▸ " : ""}
                {t.label}
              </span>
              <span className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">{t.hint}</span>
            </button>
          )
        })}
      </nav>

      {tool === "reverse" && <ReverseLocator targetLat={targetLat} targetLon={targetLon} />}
      {tool === "disturbed" && <DisturbedGround />}
      {tool === "size" && <CacheSize />}
      {tool === "submersion" && <Submersion />}
      {tool === "report" && <CacheReport targetLat={targetLat} targetLon={targetLon} />}
      {tool === "siteselect" && <SiteSelector />}
      {tool === "packaging" && <PackagingPlanner />}
      {tool === "recovery" && <RecoveryPlanner />}

      <p className="mt-4 font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
        Ερμηνευτικά εργαλεία βασισμένα στο δόγμα του εγχειριδίου — δεν αποτελούν βεβαιότητα. Η τελική επιλογή απαιτεί
        πάντα επιτόπια αυτοψία.
      </p>
    </Panel>
  )
}
