"use client"

import { useMemo, useState } from "react"
import { Field, Readout, inputClass, selectClass, buttonClass } from "./primitives"

/**
 * Επιπλέον εργαλεία δόγματος από το εγχειρίδιο «U.S. Army Special Forces
 * Caching Techniques» — επεκτάσεις της §10:
 *
 *   5. Αναφορά Κρύπτης 12 Σημείων (Παράρτημα Α — Twelve-Point Cache Report).
 *   6. Βαθμολογητής επιλογής θέσης (§1-4 Criteria for the Site).
 *   7. Σχεδιαστής συσκευασίας & προστασίας από υγρασία (Κεφ. 2 Packaging).
 *   8. Σχεδιαστής ανάκτησης (Κεφ. 4 Recovery).
 */

// ═════════════════════ Tool 5: Αναφορά Κρύπτης 12 Σημείων ═════════════════════

interface ReportField {
  id: string
  n: number
  label: string
  hint: string
  placeholder: string
  long?: boolean
}

const REPORT_FIELDS: ReportField[] = [
  { id: "type", n: 1, label: "Τύπος κρύπτης", hint: "συστατικό (μονάδα/κύτταρο/χειριστής) & σκοπός υλικού (όπλα, εκρηκτικά, επικοινωνίες)", placeholder: "π.χ. Ανταρτική ομάδα — οπλισμός & πυρομαχικά" },
  { id: "method", n: 2, label: "Μέθοδος απόκρυψης", hint: "ταφή, απόκρυψη ή βύθιση", placeholder: "" },
  { id: "contents", n: 3, label: "Περιεχόμενα", hint: "αναλυτική λίστα ανά δοχείο + τρόπος συσκευασίας κάθε είδους", placeholder: "π.χ. Δοχείο 1: 2× τυφέκια σε αλουμινόφυλλο + λαστιχένιο εξωτ. περιτύλιγμα…", long: true },
  { id: "containers", n: 4, label: "Περιγραφή δοχείων", hint: "μέγεθος, βάρος, αριθμός· κάθε δοχείο αριθμημένο & πάνω στο σκίτσο", placeholder: "π.χ. Δοχείο 1 — ανοξείδωτο 18×23×102 cm, ~14 kg" },
  { id: "general", n: 5, label: "Γενική περιοχή", hint: "αναγνωρίσιμα τοπωνύμια: χώρα, περιφέρεια, πλησιέστερο χωριό", placeholder: "π.χ. Ελλάδα — Αττική — βόρεια του χωριού Χ" },
  { id: "immediate", n: 6, label: "Άμεση περιοχή (IRP → FRP)", hint: "σημείο άμεσης αναφοράς & οδηγίες πορείας ως το τελικό σημείο αναφοράς", placeholder: "π.χ. Από το μοναδικό πέτρινο γεφύρι (IRP), 120 m ΒΑ ως τη μεμονωμένη βελανιδιά (FRP)", long: true },
  { id: "location", n: 7, label: "Θέση κρύπτης (FRP & μετρήσεις)", hint: "FRP + ακριβείς διοπτεύσεις/μετρήσεις σε ακέραιες γραμμικές μονάδες", placeholder: "", long: true },
  { id: "emplacement", n: 8, label: "Λεπτομέρειες τοποθέτησης", hint: "βάθος/κάλυψη, υποστύλωση, τύπος εδάφους, εποχιακές μεταβολές, στάθμη νερού κ.λπ.", placeholder: "π.χ. Ταφή 75 cm· κάλυψη 45 cm· αργιλώδες έδαφος· παγετός Ιαν–Φεβ", long: true },
  { id: "operational", n: 9, label: "Επιχειρησιακά δεδομένα & παρατηρήσεις", hint: "εξοπλισμός ανάκτησης, ≥2 διαδρομές με κάλυψη, τοπική ασφάλεια/περιπολίες, κάλυψη δράσης", placeholder: "π.χ. Απαιτείται καθετήρας & φτυάρι· 2 διαδρομές μέσω ρεματιάς· περίπολος κάθε ~2h", long: true },
  { id: "dates", n: 10, label: "Ημ/νία τοποθέτησης & διάρκεια", hint: "εκτίμηση για πόσο θα παραμείνει χρησιμοποιήσιμο (διάρκεια ζωής, λήξεις, αντοχή συσκευασίας)", placeholder: "π.χ. Τοποθ. 2026-09-02· εκτ. διάρκεια 24 μήνες (μπαταρίες όριο)" },
  { id: "sketches", n: 11, label: "Σκίτσα & διαγράμματα", hint: "σκίτσο περιοχής (IRP→FRP) & σκίτσο θέσης· φωτογραφίες προαιρετικές", placeholder: "π.χ. Συνημμένο σκίτσο περιοχής + διάγραμμα λάκκου· φωτο FRP", long: true },
  { id: "radio", n: 12, label: "Ραδιομήνυμα ανάκτησης", hint: "σύντομο μήνυμα: τύπος, μέθοδος & συνοπτικές οδηγίες εντοπισμού — ξεκάθαρο αλλά σύντομο", placeholder: "π.χ. ΟΠΛΑ/ΤΑΦΗ/ΓΕΦΥΡΙ 120Μ ΒΑ ΒΕΛΑΝΙΔΙΑ 6Μ Α", long: true },
]

const METHOD_OPTIONS = [
  { v: "Ταφή (burial)", l: "Ταφή (burial)" },
  { v: "Απόκρυψη (concealment)", l: "Απόκρυψη (concealment)" },
  { v: "Βύθιση (submersion)", l: "Βύθιση (submersion)" },
]

export function CacheReport({ targetLat, targetLon }: { targetLat: number; targetLon: number }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    method: METHOD_OPTIONS[0].v,
    location: `FRP: ___ · Στόχος (§7): ${targetLat.toFixed(6)}, ${targetLon.toFixed(6)}\nΔιοπτεύσεις/μετρήσεις: ___ (ακέραιες μονάδες)`,
  }))
  const [copied, setCopied] = useState(false)

  function set(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }))
    setCopied(false)
  }

  const brief = useMemo(() => {
    const lines = REPORT_FIELDS.map((f) => {
      const val = (values[f.id] ?? "").trim()
      return `${f.n}. ${f.label.toUpperCase()}\n${val || "— (δεν συμπληρώθηκε)"}`
    })
    return `ΑΝΑΦΟΡΑ ΚΡΥΠΤΗΣ 12 ΣΗΜΕΙΩΝ (Παράρτημα Α)\n${"=".repeat(42)}\n\n${lines.join("\n\n")}`
  }, [values])

  const filled = REPORT_FIELDS.filter((f) => (values[f.id] ?? "").trim().length > 0).length

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Ο τυπικός τρόπος καταγραφής μιας κρύπτης κατά το εγχειρίδιο (Παράρτημα Α): δώσε τα{" "}
        <span className="text-brass">12 απαιτούμενα σημεία</span> και το εργαλείο συνθέτει μια συνεκτική αναφορά ανάκτησης,
        δεμένη με το εκτιμώμενο σημείο του §7. Οι μετρήσεις πρέπει να είναι σε γραμμικές μονάδες που καταλαβαίνει ο πράκτορας
        ανάκτησης — κατά προτίμηση <span className="text-foreground">ακέραιοι αριθμοί</span>.
      </p>

      <div className="grid gap-3">
        {REPORT_FIELDS.map((f) => (
          <Field key={f.id} label={`${f.n}. ${f.label}`} htmlFor={`rep-${f.id}`}>
            {f.id === "method" ? (
              <select id={`rep-${f.id}`} className={selectClass} value={values.method ?? ""} onChange={(e) => set("method", e.target.value)}>
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            ) : f.long ? (
              <textarea
                id={`rep-${f.id}`}
                rows={f.id === "location" || f.id === "contents" ? 3 : 2}
                className={inputClass + " resize-y leading-relaxed"}
                placeholder={f.placeholder}
                value={values[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
              />
            ) : (
              <input
                id={`rep-${f.id}`}
                type="text"
                className={inputClass}
                placeholder={f.placeholder}
                value={values[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
              />
            )}
            <p className="mt-1 font-mono text-[0.6rem] leading-relaxed text-muted-foreground">{f.hint}</p>
          </Field>
        ))}
      </div>

      <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[0.72rem] uppercase tracking-wide text-brass">
            Σύνθεση αναφοράς · {filled}/12 σημεία
          </span>
          <button type="button" className={buttonClass + " !py-1.5 !text-[0.68rem]"} onClick={copyBrief}>
            {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
          </button>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-sm border border-panel-line bg-readout px-3 py-2.5 font-mono text-[0.66rem] leading-relaxed text-foreground">
          {brief}
        </pre>
      </div>

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
        Το εγχειρίδιο συνιστά να συντάσσεται η αναφορά <span className="text-foreground">όσο οι λεπτομέρειες είναι νωπές</span>{" "}
        στη μνήμη αυτού που τοποθέτησε την κρύπτη. Μην κρατάς αντίγραφο πάνω σου κατά την προσέγγιση της θέσης.
      </p>
    </div>
  )
}

// ═════════════════════ Tool 6: Βαθμολογητής επιλογής θέσης ═════════════════════

interface Criterion {
  id: string
  label: string
  hint: string
  weight: number
}

const SITE_CRITERIA: Criterion[] = [
  { id: "locatable", label: "Εντοπισιμότητα με απλές οδηγίες", hint: "μόνιμα, διακριτά ορόσημα σε μετρήσιμη απόσταση (§1-4a)", weight: 3 },
  { id: "routes", label: "Δύο ασφαλείς διαδρομές", hint: "εναλλακτική διαφυγή, φυσική κάλυψη και στις δύο", weight: 2 },
  { id: "allseason", label: "Πρόσβαση σε όλες τις εποχές", hint: "χωρίς εμπόδιο από χιόνι/παγετό/φύλλωμα", weight: 2 },
  { id: "concealment", label: "Απόκρυψη / μυστικότητα", hint: "δεν τραβά την προσοχή· απομονωμένο από περιέργους", weight: 3 },
  { id: "drainage", label: "Αποστράγγιση / υψόμετρο", hint: "ψηλό έδαφος & κατάλληλο έδαφος (μόνο για ταφή) (§1-4d)", weight: 2 },
  { id: "permanence", label: "Μονιμότητα σημείων αναφοράς", hint: "τα ορόσημα θα παραμείνουν σταθερά όσο χρειάζεται η κρύπτη", weight: 3 },
  { id: "population", label: "Χαμηλή δραστηριότητα πληθυσμού", hint: "μακριά από κίνηση, οικοδομές, στρατηγικούς στόχους", weight: 2 },
]

const RATINGS = [
  { v: 0, l: "0 · Ακατάλληλο" },
  { v: 1, l: "1 · Φτωχό" },
  { v: 2, l: "2 · Αποδεκτό" },
  { v: 3, l: "3 · Άριστο" },
]

interface Candidate {
  id: string
  name: string
  scores: Record<string, number>
}

const MAX_WEIGHTED = SITE_CRITERIA.reduce((s, c) => s + c.weight * 3, 0)

function candidateTotal(c: Candidate) {
  return SITE_CRITERIA.reduce((s, cr) => s + (c.scores[cr.id] ?? 0) * cr.weight, 0)
}

let candSeq = 2

export function SiteSelector() {
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: "site-1", name: "Θέση Α", scores: {} },
  ])

  function update(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function setScore(id: string, crId: string, v: number) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, scores: { ...c.scores, [crId]: v } } : c)))
  }
  function addCandidate() {
    setCandidates((prev) => [...prev, { id: `site-${candSeq}`, name: `Θέση ${String.fromCharCode(64 + candSeq++)}`, scores: {} }])
  }
  function removeCandidate(id: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== id))
  }

  const ranked = useMemo(
    () => [...candidates].map((c) => ({ c, total: candidateTotal(c) })).sort((a, b) => b.total - a.total),
    [candidates],
  )

  function verdict(pct: number) {
    if (pct >= 80) return { text: "Ισχυρός υποψήφιος", tone: "text-phosphor" }
    if (pct >= 60) return { text: "Βιώσιμος — με επιφυλάξεις", tone: "text-brass" }
    if (pct >= 40) return { text: "Αδύναμος — χρειάζεται εναλλακτική", tone: "text-muted-foreground" }
    return { text: "Απορριπτέος", tone: "text-destructive" }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Βαθμολόγησε κάθε υποψήφια θέση ως προς τα κριτήρια του δόγματος (§1-4). Κάθε κριτήριο έχει{" "}
        <span className="text-brass">βάρος</span> ανάλογα με τη σημασία του· το σύστημα κατατάσσει τις θέσεις. Η ασφάλεια
        είναι πάντα η υπερισχύουσα παράμετρος — μια θέση που αποτυγχάνει στην εντοπισιμότητα ή τη μονιμότητα απορρίπτεται
        ασχέτως άλλων πλεονεκτημάτων.
      </p>

      {candidates.map((c) => {
        const total = candidateTotal(c)
        const pct = Math.round((total / MAX_WEIGHTED) * 100)
        return (
          <div key={c.id} className="rounded-sm border border-panel-line bg-readout p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <input
                type="text"
                aria-label="Όνομα θέσης"
                className={inputClass + " max-w-[60%]"}
                value={c.name}
                onChange={(e) => update(c.id, { name: e.target.value })}
              />
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-phosphor">{pct}%</span>
                {candidates.length > 1 && (
                  <button
                    type="button"
                    className="font-mono text-[0.66rem] text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => removeCandidate(c.id)}
                  >
                    Διαγραφή
                  </button>
                )}
              </span>
            </div>
            <div className="grid gap-2.5">
              {SITE_CRITERIA.map((cr) => (
                <div key={cr.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-[0.7rem] text-foreground">
                      {cr.label} <span className="text-brass">·×{cr.weight}</span>
                    </span>
                    <span className="font-mono text-[0.58rem] leading-relaxed text-muted-foreground">{cr.hint}</span>
                  </div>
                  <select
                    aria-label={cr.label}
                    className={selectClass + " w-32"}
                    value={c.scores[cr.id] ?? 0}
                    onChange={(e) => setScore(c.id, cr.id, Number.parseInt(e.target.value, 10))}
                  >
                    {RATINGS.map((r) => (
                      <option key={r.v} value={r.v}>
                        {r.l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button
        type="button"
        className="self-start rounded-sm border border-brass-dim px-3 py-2 font-mono text-[0.72rem] text-phosphor transition-colors hover:border-brass"
        onClick={addCandidate}
      >
        + Προσθήκη υποψήφιας θέσης για σύγκριση
      </button>

      <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
        <p className="mb-2.5 font-mono text-[0.72rem] uppercase tracking-wide text-brass">Κατάταξη θέσεων</p>
        <ol className="flex flex-col gap-2">
          {ranked.map((r, i) => {
            const pct = Math.round((r.total / MAX_WEIGHTED) * 100)
            const v = verdict(pct)
            return (
              <li key={r.c.id} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-panel-line font-mono text-[0.66rem] text-muted-foreground">
                  {i + 1}
                </span>
                <span className="w-24 shrink-0 truncate font-mono text-[0.72rem] text-foreground">{r.c.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-panel-line bg-panel">
                  <div
                    className={"h-full transition-all " + (pct >= 60 ? "bg-phosphor" : pct >= 40 ? "bg-brass" : "bg-phosphor-dim")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[0.68rem] text-muted-foreground">{pct}%</span>
                <span className={"w-40 shrink-0 text-right font-mono text-[0.62rem] " + v.tone}>{v.text}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// ═════════════════════ Tool 7: Σχεδιαστής συσκευασίας & υγρασίας ═════════════════════

type Contents = "metal" | "comms" | "docs" | "perishable" | "mixed"
type Climate = "arid" | "temperate" | "humid"
type Method = "burial" | "concealment" | "submersion"

const CONTENTS_OPTS: { v: Contents; l: string }[] = [
  { v: "metal", l: "Μέταλλα / όπλα / πυρομαχικά" },
  { v: "comms", l: "Ηλεκτρονικά / επικοινωνίες" },
  { v: "docs", l: "Έγγραφα / χρήματα" },
  { v: "perishable", l: "Φθαρτά (φάρμακα, μπαταρίες)" },
  { v: "mixed", l: "Μικτό φορτίο" },
]
const CLIMATE_OPTS: { v: Climate; l: string }[] = [
  { v: "arid", l: "Ξηρό / έρημος" },
  { v: "temperate", l: "Εύκρατο" },
  { v: "humid", l: "Υγρό / τροπικό" },
]
const METHOD_OPTS: { v: Method; l: string }[] = [
  { v: "burial", l: "Ταφή" },
  { v: "concealment", l: "Απόκρυψη" },
  { v: "submersion", l: "Βύθιση" },
]

export function PackagingPlanner() {
  const [contents, setContents] = useState<Contents>("metal")
  const [climate, setClimate] = useState<Climate>("temperate")
  const [method, setMethod] = useState<Method>("burial")
  const [months, setMonths] = useState(24)

  const plan = useMemo(() => {
    const steps: { title: string; detail: string }[] = []

    // Επιθεώρηση & καθαρισμός — πάντα
    steps.push({ title: "Επιθεώρηση & καθαρισμός", detail: "Αφαίρεσε ρύπους, λιπαντικά και υπολείμματα από κάθε είδος πριν τη συσκευασία." })

    // Στέγνωμα — κρίσιμο για διαβρώσιμα/υγρά κλίματα
    if (contents !== "docs") {
      steps.push({
        title: "Στέγνωμα",
        detail:
          "Απομάκρυνε κάθε ίχνος υγρασίας από τα διαβρώσιμα. Προτιμότερη μέθοδος: θέρμανση σε φούρνο ~110°F (43°C) για ≥3 ώρες" +
          (climate === "humid" ? " — σε υγρό κλίμα στέγνωσε πρώτα τον ίδιο τον φούρνο στους ~212°F (100°C)." : "."),
      })
    }

    // Συντηρητικό
    if (contents === "metal" || contents === "mixed") {
      steps.push({ title: "Επίστρωση συντηρητικού", detail: "Ελαφρύ στρώμα λαδιού στις μεταλλικές επιφάνειες κατά της διάβρωσης." })
    }

    // Εσωτερικό περιτύλιγμα
    const inner =
      contents === "comms" || contents === "docs"
        ? "Αλουμινόφυλλο (βαρέος τύπου) ως εσωτερικό — αδιάβροχο όσο δεν τρυπιέται & οι πτυχές σφραγίζονται καλά. Χαρτί ανθεκτικό στην υγρασία ως πρώτη στρώση για να μην κολλά το λάστιχο/κερί."
        : "Αλουμινόφυλλο βαρέος τύπου ως εσωτερικό περιτύλιγμα, με χαρτί ανθεκτικό στην υγρασία για να μην κολλούν λάστιχο/κερί στα είδη."
    steps.push({ title: "Εσωτερικό περιτύλιγμα", detail: inner })

    // Εξωτερικό περιτύλιγμα
    const outer =
      method === "submersion" || climate === "humid"
        ? "Ισχυρή εξωτερική στρώση: λαστιχένια κόλλα επισκευής (rubber repair gum) 2 mm — σφράγιση ≥1,25 cm πλάτους με πίεση χεριού· άφησε το backing για να μην κολλά."
        : "Ανθεκτικό εξωτερικό: Grade «C» barrier (κερωμένο ύφασμα, αυτοσφραγιζόμενο) ή λαστιχένια κόλλα επισκευής 2 mm για σκληρή μηχανική προστασία."
    steps.push({ title: "Εξωτερικό περιτύλιγμα", detail: outer })

    // Αφυγραντικό
    if (contents !== "docs" || climate === "humid") {
      steps.push({
        title: "Αφυγραντικό (desiccant)",
        detail: "Πρόσθεσε silica gel μέσα στο δοχείο — ποτέ σε άμεση επαφή με μεταλλική επιφάνεια. Περισσότερο σε υγρό κλίμα και μεγάλη διάρκεια.",
      })
    }

    // Δοχείο & σφράγιση
    steps.push({
      title: "Δοχείο & σφράγιση",
      detail:
        method === "submersion"
          ? "Απαιτείται δοχείο υψηλών προδιαγραφών, αδιάβροχο & ανθεκτικό σε πίεση (τα field expedients σπάνια επαρκούν στη βύθιση)."
          : contents === "comms" || months > 24
            ? "Προτιμότερο ανοξείδωτο δοχείο, ερμητικά σφραγισμένο. Έλεγξε κάθε ραφή/σφράγιση."
            : "Στεγανό μεταλλικό δοχείο (π.χ. ammo can) με καλή σφράγιση· έλεγξε το λάστιχο του καπακιού.",
    })

    // Δοκιμή βύθισης — έλεγχος στεγανότητας
    steps.push({
      title: "Δοκιμή βύθισης (submersion test)",
      detail: "Βύθισε το σφραγισμένο δοχείο σε νερό και παρατήρησε για φυσαλίδες — επιβεβαιώνει τη στεγανότητα πριν την τοποθέτηση.",
    })

    // Οδηγίες χρήσης
    steps.push({
      title: "Οδηγίες χρήσης μέσα στο δοχείο",
      detail: "Συμπερίλαβε οδηγίες αποσυσκευασίας/ενεργοποίησης του εξοπλισμού — ο πράκτορας ανάκτησης μπορεί να μην είναι εξοικειωμένος.",
    })

    return steps
  }, [contents, climate, method, months])

  const durabilityNote =
    months > 36
      ? { text: "Μεγάλη διάρκεια — διπλή στεγανή στρώση & γενναιόδωρο αφυγραντικό.", tone: "text-brass" }
      : months > 12
        ? { text: "Μεσοπρόθεσμη — τυπική διπλή συσκευασία επαρκεί.", tone: "text-muted-foreground" }
        : { text: "Βραχυπρόθεσμη — βασική στεγανή προστασία επαρκεί.", tone: "text-muted-foreground" }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Με βάση τα περιεχόμενα, το κλίμα και τη διάρκεια ταφής, το εργαλείο προτείνει υλικά περιτυλίγματος, αφυγραντικό και
        σφράγιση δοχείου σύμφωνα με τους πίνακες του Κεφ. 2 (Packaging). Στόχος: <span className="text-brass">μηδενική υγρασία</span>{" "}
        στο εσωτερικό για όλη τη διάρκεια της κρύπτης.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Περιεχόμενα" htmlFor="pk-contents">
          <select id="pk-contents" className={selectClass} value={contents} onChange={(e) => setContents(e.target.value as Contents)}>
            {CONTENTS_OPTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Κλίμα" htmlFor="pk-climate">
          <select id="pk-climate" className={selectClass} value={climate} onChange={(e) => setClimate(e.target.value as Climate)}>
            {CLIMATE_OPTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Μέθοδος απόκρυψης" htmlFor="pk-method">
          <select id="pk-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
            {METHOD_OPTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Διάρκεια ταφής (μήνες)" htmlFor="pk-months">
          <input
            id="pk-months"
            type="number"
            min={1}
            step="1"
            className={inputClass}
            value={months}
            onChange={(e) => setMonths(Number.parseInt(e.target.value, 10) || 0)}
          />
        </Field>
      </div>

      <div className="rounded-sm border border-panel-line bg-readout px-3.5 py-2.5">
        <span className={"font-mono text-[0.66rem] " + durabilityNote.tone}>Διάρκεια: {durabilityNote.text}</span>
      </div>

      <ol className="flex flex-col gap-2">
        {plan.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-sm border border-panel-line bg-readout px-3.5 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brass font-mono text-[0.66rem] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[0.74rem] font-semibold text-phosphor">{s.title}</span>
              <span className="font-mono text-[0.66rem] leading-relaxed text-muted-foreground">{s.detail}</span>
            </div>
          </li>
        ))}
      </ol>

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
        Κανόνας διπλού περιτυλίγματος (§2-4): μια <span className="text-foreground">λεπτή & εύκαμπτη εσωτερική</span> στρώση και
        μια <span className="text-foreground">ανθεκτική εξωτερική</span> — η σκληρή εξωτερική είναι απαραίτητη εκτός αν το δοχείο
        & η προστασία εμποδίζουν κάθε τριβή μεταξύ αντικειμένων.
      </p>
    </div>
  )
}

// ═════════════════════ Tool 8: Σχεδιαστής ανάκτησης ═════════════════════

const RECOVERY_CHECKS: { id: string; label: string; hint: string }[] = [
  { id: "practice", label: "Εξάσκηση σε δοκιμαστική (dummy) κρύπτη", hint: "ο πράκτορας ανάκτησης να έχει εξασκηθεί σε εντοπισμό & ανάσκαψη" },
  { id: "sketch", label: "Σκίτσο θέσης & διαδρομής — όχι πάνω στο σώμα", hint: "σχεδίασέ το πριν ξεκινήσεις· μην το κρατάς επάνω σου (κίνδυνος αποκάλυψης)" },
  { id: "recon", label: "Προκαταρκτική αναγνώριση από χάρτη", hint: "ανάλυση χάρτη ώστε να ελαχιστοποιηθεί η ύποπτη κίνηση κοντά στη θέση" },
  { id: "daylight", label: "Εντοπισμός με φως ημέρας + διακριτικό σημάδι", hint: "αν η ανάκτηση γίνει νύχτα, εντόπισε τη θέση μέρα & βάλε αδιόρατο σημάδι" },
  { id: "probe", label: "Καθετήρας με το χέρι — ποτέ με σφυρί", hint: "σπρώξε τον καθετήρα με το χέρι για να μην τρυπήσει το δοχείο· περιστροφή αντί για χτύπημα" },
  { id: "filler", label: "Αντικείμενο πλήρωσης ίδιου μεγέθους", hint: "για να γεμίσεις την κοιλότητα που αφήνει η αφαίρεση της κρύπτης" },
  { id: "conceal", label: "Υλικό απόκρυψης για τη μεταφορά", hint: "δοχείο/περιτύλιγμα για να κρυφτεί το υλικό ως το safehouse" },
  { id: "grapple", label: "Γάντζοι/σχοινιά (μόνο υποβρύχια κρύπτη)", hint: "για βαριά βυθισμένη κρύπτη — η ανάκτηση συχνά δυσκολότερη της τοποθέτησης" },
  { id: "whole", label: "Απλές, ακέραιες μετρήσεις & διοπτεύσεις", hint: "6 m, όχι 6,3 — «keep measurements simple / whole-number sightings» για σύντομες, ξεκάθαρες οδηγίες" },
  { id: "sterilize", label: "Σχέδιο αποστείρωσης της θέσης μετά", hint: "επαναφορά εδάφους/βλάστησης ώστε να μη φαίνεται διαταραγμένο" },
]

export function RecoveryPlanner() {
  const [primary, setPrimary] = useState("")
  const [alternate, setAlternate] = useState("")
  const [security, setSecurity] = useState("")
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const done = checked.size
  const total = RECOVERY_CHECKS.length
  const ready = done === total && primary.trim() && alternate.trim()

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
        Ο σχεδιασμός ανάκτησης (Κεφ. 4) μοιάζει με την τοποθέτηση, με έμφαση σε λίγα κρίσιμα σημεία. Κατέγραψε{" "}
        <span className="text-brass">κύρια & εναλλακτική διαδρομή</span> με φυσική κάλυψη και μέσο διαφυγής, σημείωσε τις τοπικές
        δυνάμεις ασφαλείας, και πέρασε από τη λίστα ελέγχου πριν την επιχείρηση.
      </p>

      <div className="grid gap-3">
        <Field label="Κύρια διαδρομή (με φυσική κάλυψη)" htmlFor="rc-primary">
          <textarea
            id="rc-primary"
            rows={2}
            className={inputClass + " resize-y leading-relaxed"}
            placeholder="π.χ. Από safehouse μέσω ρεματιάς ΒΑ, στάση ελέγχου στο πέτρινο μαντρί, είσοδος από τη σκιά της συστάδας δέντρων."
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
        </Field>
        <Field label="Εναλλακτική διαδρομή / διαφυγή" htmlFor="rc-alt">
          <textarea
            id="rc-alt"
            rows={2}
            className={inputClass + " resize-y leading-relaxed"}
            placeholder="π.χ. Έξοδος προς Δ κατά μήκος του φράχτη, εναλλακτικό σημείο συνάντησης στο παλιό λατομείο."
            value={alternate}
            onChange={(e) => setAlternate(e.target.value)}
          />
        </Field>
        <Field label="Τοπική ασφάλεια & στάσεις (security halts)" htmlFor="rc-sec">
          <textarea
            id="rc-sec"
            rows={2}
            className={inputClass + " resize-y leading-relaxed"}
            placeholder="π.χ. Περίπολος κάθε ~2h στον χωματόδρομο· φυλάκιο 300 m Ν· στάση παρατήρησης 10 λεπτά πριν την τελική προσέγγιση."
            value={security}
            onChange={(e) => setSecurity(e.target.value)}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-wide text-brass">
          Λίστα ελέγχου πριν την επιχείρηση · {done}/{total}
        </p>
        <div className="grid gap-2">
          {RECOVERY_CHECKS.map((c) => {
            const active = checked.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(c.id)}
                className={
                  "flex items-start gap-2.5 rounded-sm border px-3 py-2.5 text-left transition-colors " +
                  (active ? "border-brass bg-secondary/50" : "border-panel-line hover:border-brass-dim")
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
                    {c.label}
                  </span>
                  <span className="font-mono text-[0.62rem] leading-relaxed text-muted-foreground">{c.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-sm border border-brass-dim/50 bg-secondary/30 px-3.5 py-3">
        <div className="flex items-center justify-between font-mono text-[0.74rem]">
          <span className="text-muted-foreground">Ετοιμότητα επιχείρησης</span>
          <span className={ready ? "text-phosphor" : "text-brass"}>
            {ready ? "Έτοιμο — όλα τα σημεία καλυμμένα" : "Εκκρεμότητες πριν την εκκίνηση"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-panel-line bg-panel">
            <div
              className={"h-full transition-all " + (ready ? "bg-phosphor" : "bg-brass")}
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[0.64rem] text-muted-foreground">{Math.round((done / total) * 100)}%</span>
        </div>
      </div>

      <p className="rounded-sm border border-panel-line bg-readout px-3.5 py-3 font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
        Κανόνας απλότητας (§1-5): κράτα τις μετρήσεις απλές με <span className="text-foreground">ακέραιους αριθμούς</span> — δεν
        παίρνεις ακέραιους διαλέγοντας πρώτα το σημείο και μετά μετρώντας· ξεκίνα με την ιδέα της απλής μέτρησης και τοποθέτησε
        την κρύπτη ανάλογα.
      </p>
    </div>
  )
}
