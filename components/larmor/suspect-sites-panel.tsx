"use client"

import { useMemo, useState } from "react"
import { Panel, Readout } from "./primitives"

/**
 * §9 — Ύποπτα σημεία απόκρυψης στόχου.
 *
 * Η ενότητα μεταφράζει το δόγμα του εγχειριδίου «U.S. Army Special Forces
 * Caching Techniques» (Κεφ. 1 — Caching Considerations) σε πρακτικό,
 * ιεραρχημένο κατάλογο σημείων που πρέπει να ελέγξει ο ερευνητής γύρω από
 * το εκτιμώμενο σημείο-στόχο της §7. Ο ερευνητής δηλώνει τα χαρακτηριστικά
 * του εδάφους/περιβάλλοντος και η εφαρμογή ταξινομεί τα ύποπτα σημεία
 * ανάλογα με το πόσο ευνοούνται από αυτά τα χαρακτηριστικά.
 */

type Method = "concealment" | "burial" | "submersion"

type EnvKey =
  | "urban"
  | "ruins"
  | "underground"
  | "wooded"
  | "highGround"
  | "nearWater"
  | "sandyLoam"
  | "infrastructure"

const METHOD_LABEL: Record<Method, string> = {
  concealment: "Απόκρυψη",
  burial: "Ταφή",
  submersion: "Βύθιση",
}

const METHOD_TONE: Record<Method, string> = {
  concealment: "text-brass border-brass-dim",
  burial: "text-phosphor border-phosphor-dim",
  submersion: "text-foreground border-panel-line",
}

const ENV_OPTIONS: { key: EnvKey; label: string; hint: string }[] = [
  { key: "urban", label: "Δομημένο / αστικό", hint: "κτίρια, τοίχοι, δρόμοι" },
  { key: "ruins", label: "Ερείπια / μνημεία", hint: "ιστορικά κτίσματα, τάφοι" },
  { key: "underground", label: "Σπήλαια / ορυχεία", hint: "φυσικά ή τεχνητά κενά" },
  { key: "wooded", label: "Δάσος / θάμνοι", hint: "φυσική κάλυψη, φύλλωμα" },
  { key: "highGround", label: "Υψηλό & στραγγιζόμενο", hint: "καλή απορροή υδάτων" },
  { key: "nearWater", label: "Κοντά σε νερό", hint: "ρέμα, ποτάμι, λίμνη, ακτή" },
  { key: "sandyLoam", label: "Αμμώδες / χαλαρό χώμα", hint: "εύκολη εκσκαφή" },
  { key: "infrastructure", label: "Υποδομές", hint: "οχετοί, υπόνομοι, αγωγοί" },
]

interface SuspectSpot {
  id: string
  name: string
  method: Method
  look: string
  favors: EnvKey[]
  disfavors?: EnvKey[]
}

/**
 * Ορόσημα που μπορεί να έχει ο ερευνητής κοντά στην περιοχή έρευνας.
 * Κάθε ορόσημο:
 *  - `search`  : πού ακριβώς να ψάξει σε σχέση με το ορόσημο (δόγμα §1-4)
 *  - `offset`  : τυπικό μετρημένο διάνυσμα απόστασης/φοράς από τη βάση του
 *                (τα caches τοποθετούνται σε μετρήσιμη απόσταση/αζιμούθιο από
 *                μόνιμα σημεία αναφοράς — §1-5/§1-6)
 *  - `method`  : κύρια μέθοδος απόκρυψης που ευνοεί
 *  - `env`     : χαρακτηριστικά εδάφους που συνεπάγεται (τροφοδοτούν την ιεράρχηση)
 *  - `isReference` : αν λειτουργεί κυρίως ως σημείο αναφοράς εντοπισμού
 */
interface Landmark {
  id: string
  label: string
  icon: string
  method: Method
  search: string
  offset: string
  env: EnvKey[]
  isReference?: boolean
}

const LANDMARKS: Landmark[] = [
  {
    id: "threshing-floor",
    label: "Αλώνι",
    icon: "◎",
    method: "burial",
    search:
      "Έλεγξε τις περιμετρικές όρθιες πέτρες και τη βάση της κεντρικής πλάκας· ταφή συνήθως λίγα βήματα έξω από το χείλος, στην υπήνεμη πλευρά.",
    offset: "2–5 m ακτινικά από το χείλος, σε σταθερό αζιμούθιο προς μόνιμο σημάδι.",
    env: ["highGround"],
    isReference: true,
  },
  {
    id: "well",
    label: "Πηγάδι",
    icon: "○",
    method: "concealment",
    search:
      "Κοιλότητες πίσω από χαλαρές πέτρες της εσωτερικής λιθοδομής 1–2 m κάτω από το χείλος· ξηρά/εγκαταλελειμμένα πηγάδια είναι κλασικές κρύπτες.",
    offset: "Εντός του φρέατος ή στη βάση της στεφάνης· έλεγξε στάθμη νερού για κίνδυνο πλημμύρας.",
    env: ["infrastructure", "nearWater"],
    isReference: true,
  },
  {
    id: "old-church",
    label: "Παλιά εκκλησία / ξωκλήσι",
    icon: "†",
    method: "concealment",
    search:
      "Βάση αγίας τράπεζας, χαλαρές πλάκες δαπέδου, εσοχές τοίχων, κωδωνοστάσιο και τυχόν κρύπτη· μόνιμο δημόσιο κτίσμα με σπάνιες ανακαινίσεις.",
    offset: "Εντός του κτίσματος ή στη θεμελίωση· μπορεί να χρησιμεύσει και ως σημείο αναφοράς.",
    env: ["urban", "ruins"],
    isReference: true,
  },
  {
    id: "marked-tree",
    label: "Σημαδεμένο δέντρο",
    icon: "♣",
    method: "burial",
    search:
      "Κλασικό ορόσημο ταφής — σκάψε κοντά στο ριζικό σύστημα, συχνά στη σκιερή/βόρεια πλευρά του κορμού όπου το χώμα είναι πιο χαλαρό.",
    offset: "Μετρημένη απόσταση & φορά από τη βάση του κορμού (π.χ. βήματα προς συγκεκριμένο αζιμούθιο).",
    env: ["wooded", "highGround"],
    isReference: true,
  },
  {
    id: "rocks",
    label: "Βράχια / βραχώδης σχηματισμός",
    icon: "◭",
    method: "concealment",
    search:
      "Φυσικές κοιλότητες κάτω ή ανάμεσα σε ογκόλιθους, ρωγμές και κάτω από χαλαρές πλάκες· ένας διακριτός βράχος είναι εξαιρετικό σημείο αναφοράς.",
    offset: "Στη βάση ή σε σχισμή· μέτρησε από την πιο διακριτή κορυφή/ακμή.",
    env: ["highGround", "wooded"],
    isReference: true,
  },
  {
    id: "dry-stone-wall",
    label: "Ξερολιθιά / πέτρινη μάντρα",
    icon: "▤",
    method: "concealment",
    search:
      "Χαλαρές πέτρες, εσωτερικά κενά και ιδίως οι γωνίες/άκρα του τοίχου· αναζήτησε σημεία που ηχούν κούφια ή με πρόσφατη μετακίνηση.",
    offset: "Εντός του τοίχου ή στη βάση· μέτρησε από γωνία ή στύλο πύλης.",
    env: ["ruins"],
  },
  {
    id: "ruined-house",
    label: "Ερειπωμένο σπίτι / μαντρί",
    icon: "⌂",
    method: "concealment",
    search:
      "Εστία/τζάκι, κατώφλια, χαλαρές πλάκες δαπέδου και εντοιχισμένα κενά· εγκαταλελειμμένα κτίρια επιτρέπουν εύκολη επανεπίσκεψη.",
    offset: "Εντός του κτίσματος· ταφή δυνατή στο περιβάλλον οικόπεδο με σταθερό σημάδι.",
    env: ["ruins", "urban"],
  },
  {
    id: "cistern",
    label: "Στέρνα / γούρνα",
    icon: "▣",
    method: "concealment",
    search:
      "Εσωτερικό ξηρής στέρνας, πίσω από τη λιθοδομή ή κάτω από το κάλυμμα· προσοχή στη στάθμη νερού και στην υγρασία.",
    offset: "Εντός της κατασκευής ή στη βάση των τοιχωμάτων.",
    env: ["infrastructure", "nearWater"],
  },
  {
    id: "cemetery",
    label: "Νεκροταφείο / τάφος",
    icon: "✝",
    method: "concealment",
    search:
      "Κρύπτες, μαυσωλεία, βάσεις επιτύμβιων στηλών· μόνιμα κτίσματα που σπάνια ανασκάπτονται ή κατεδαφίζονται.",
    offset: "Εντός ταφικού κτίσματος ή στη βάση μόνιμης στήλης.",
    env: ["ruins", "urban"],
    isReference: true,
  },
  {
    id: "bridge",
    label: "Γεφύρι",
    icon: "⌒",
    method: "concealment",
    search:
      "Ακρόβαθρα, οχετοί και χαλαρές πέτρες στο κάτω μέρος του τόξου· έλεγξε για κίνδυνο πλημμύρας κοντά στη ροή.",
    offset: "Στα ακρόβαθρα ή σε κοντινό οχετό· μέτρησε από την άκρη του καταστρώματος.",
    env: ["infrastructure", "nearWater"],
    isReference: true,
  },
  {
    id: "spring",
    label: "Βρύση / πηγή",
    icon: "≈",
    method: "burial",
    search:
      "Ταφή πάνω από την ανώτατη ετήσια στάθμη νερού, σε στραγγιζόμενο σημείο κοντά στην πηγή· η βρύση χρησιμεύει ως σταθερό σημείο αναφοράς.",
    offset: "Υπερυψωμένο σημείο, μετρημένη απόσταση από τη λεκάνη/κρουνό.",
    env: ["nearWater", "highGround"],
    isReference: true,
  },
  {
    id: "crossroads",
    label: "Σταυροδρόμι / διχάλα",
    icon: "✛",
    method: "burial",
    search:
      "Ταφή σε μετρημένο διάνυσμα από το κέντρο της διασταύρωσης· τα σταυροδρόμια & χιλιομετρικοί δείκτες είναι κύρια σημεία αναφοράς του εγχειριδίου.",
    offset: "Σταθερή απόσταση & αζιμούθιο από τον κόμβο ή τον χιλιομετρικό δείκτη.",
    env: ["highGround"],
    isReference: true,
  },
  {
    id: "cave",
    label: "Σπηλιά",
    icon: "◗",
    method: "concealment",
    search:
      "Ξηρά εσωτερικά κενά, εσοχές και κάτω από πεσμένους ογκόλιθους· ελάχιστη ανάγκη συσκευασίας, προστασία από τα στοιχεία.",
    offset: "Στο εσωτερικό, μετρημένη απόσταση από την είσοδο/διακριτό σχηματισμό.",
    env: ["underground", "wooded"],
  },
  {
    id: "shrine",
    label: "Εικονοστάσι / προσκυνητάρι",
    icon: "⛨",
    method: "concealment",
    search:
      "Κοιλότητα πίσω/κάτω από την εικόνα, στη βάση του κτίσματος ή σε χαλαρή πέτρα· μικρό αλλά μόνιμο & διακριτό ορόσημο.",
    offset: "Εντός ή στη βάση του· άριστο σημείο αναφοράς λόγω μοναδικότητας.",
    env: ["ruins"],
    isReference: true,
  },
]

// Πηγή: κατάλογος πιθανών σημείων απόκρυψης (§1-4c) + κριτήρια ταφής (§1-4d)
// + σημεία βύθισης (§1-4e) του εγχειριδίου.
const SUSPECT_SPOTS: SuspectSpot[] = [
  {
    id: "caves",
    name: "Σπήλαια, σπηλιές, εγκαταλελειμμένα ορυχεία & λατομεία",
    method: "concealment",
    look: "Ξηρά φυσικά ή τεχνητά κενά· προστατεύουν από τα στοιχεία και χρειάζονται ελάχιστη συσκευασία.",
    favors: ["underground", "wooded"],
  },
  {
    id: "walls",
    name: "Τοίχοι — πίσω από χαλαρά τούβλα/πέτρες ή σοβά",
    method: "concealment",
    look: "Πρόσφατος ή αταίριαστος σοβάς, χαλαρές πέτρες, κοιλότητες που ηχούν κούφιες.",
    favors: ["urban", "ruins"],
  },
  {
    id: "abandoned",
    name: "Εγκαταλελειμμένα κτίρια",
    method: "concealment",
    look: "Δάπεδα, εστίες, εντοιχισμένα κενά· εύκολη επανεπίσκεψη χωρίς να τραβά προσοχή.",
    favors: ["urban", "ruins"],
  },
  {
    id: "rare-structures",
    name: "Σπάνια χρησιμοποιούμενες κατασκευές (στάδια, εγκαταστάσεις σε νεκρές σιδηρ. γραμμές)",
    method: "concealment",
    look: "Χώροι με χαμηλή επισκεψιμότητα αλλά διαρκή πρόσβαση για τον ανακτούντα.",
    favors: ["urban", "infrastructure"],
  },
  {
    id: "memorials",
    name: "Ταφικά/μνημειακά κτίσματα (μαυσωλεία, κρύπτες, μνημεία)",
    method: "concealment",
    look: "Μόνιμες κατασκευές με κοιλότητες· σπάνια ανασκάπτονται ή κατεδαφίζονται.",
    favors: ["ruins", "urban"],
  },
  {
    id: "public",
    name: "Δημόσια κτίρια (μουσεία, εκκλησίες, βιβλιοθήκες)",
    method: "concealment",
    look: "Σταθερά κτίρια — αλλά έλεγξε αν συχνάζονται από φρουρούς/επισκέπτες (μειώνει την ασφάλεια).",
    favors: ["urban"],
  },
  {
    id: "ruins",
    name: "Ερείπια ιστορικού ενδιαφέροντος",
    method: "concealment",
    look: "Ασαφή, μόνιμα ορόσημα· ιδανικά όταν υπάρχουν διακριτά σταθερά σημεία αναφοράς.",
    favors: ["ruins"],
  },
  {
    id: "culverts",
    name: "Οχετοί (culverts)",
    method: "concealment",
    look: "Μόνιμες κατασκευές διέλευσης νερού· εύκολη πρόσβαση αλλά κίνδυνος πλημμύρας.",
    favors: ["infrastructure", "nearWater"],
  },
  {
    id: "sewers",
    name: "Υπόνομοι",
    method: "concealment",
    look: "Υπόγειο δίκτυο με σημεία πρόσβασης· έλεγξε φρεάτια κοντά στο εκτιμώμενο σημείο.",
    favors: ["infrastructure", "urban"],
  },
  {
    id: "conduits",
    name: "Αγωγοί / καναλάκια καλωδίων",
    method: "concealment",
    look: "Στενά μόνιμα κανάλια κατά μήκος υποδομών· κρύβουν μικρά αντικείμενα.",
    favors: ["infrastructure", "urban"],
  },
  {
    id: "high-ground",
    name: "Υψηλό, καλά στραγγιζόμενο έδαφος",
    method: "burial",
    look: "Η υγρασία είναι η μεγαλύτερη απειλή — προτιμώνται υπερυψωμένες, στεγνές θέσεις.",
    favors: ["highGround", "wooded"],
    disfavors: ["nearWater"],
  },
  {
    id: "sandy-loam",
    name: "Θύλακας αμμώδους/χαλαρού χώματος",
    method: "burial",
    look: "Αμμοπηλός: εύκολη εκσκαφή & καλή στράγγιση. Απόφυγε άργιλο (σκληραίνει/κολλάει).",
    favors: ["sandyLoam", "highGround"],
  },
  {
    id: "landmark-base",
    name: "Βάση διακριτού μόνιμου ορόσημου (δέντρο, βράχος, μαρκαδόρος)",
    method: "burial",
    look: "Ταφή απαιτεί μόνιμα, μετρήσιμα ορόσημα σε κοντινή απόσταση για επαναεντοπισμό.",
    favors: ["wooded", "highGround"],
  },
  {
    id: "leaf-cover",
    name: "Κάτω από φύλλωμα/χούμο σε συστάδα δέντρων",
    method: "burial",
    look: "Επικάλυψη φύλλων που επανατοποθετείται εύκολα και κρύβει φρεσκοσκαμμένο λάκκο.",
    favors: ["wooded"],
    disfavors: ["urban"],
  },
  {
    id: "above-waterline",
    name: "Πάνω από την ανώτατη ετήσια στάθμη νερού, κοντά σε ρέμα",
    method: "burial",
    look: "Αν το σημείο είναι κοντά σε νερό, πρέπει να είναι αρκετά ψηλά ώστε να μην αποκαλυφθεί σε πλημμύρα.",
    favors: ["nearWater", "highGround"],
  },
  {
    id: "submerged",
    name: "Βυθός λίμνης/ποταμού ή υφαλος κοντά σε σταθερό σημείο αναφοράς",
    method: "submersion",
    look: "Σπάνια μέθοδος — απαιτεί βάρος/αγκυροβόλιο & γνώση βυθού/ρευμάτων. Έλεγξε μόνο αν υπάρχει νερό.",
    favors: ["nearWater"],
  },
]

// Σημεία αναφοράς εντοπισμού από τη χαρτογραφική έρευνα (§1-5a).
const REFERENCE_POINTS = [
  "συμβολές ρεμάτων",
  "φράγματα & καταρράκτες",
  "διασταυρώσεις δρόμων & χιλιομετρικοί δείκτες",
  "χωριά",
  "γέφυρες",
  "εκκλησίες",
  "νεκροταφεία",
]

export function SuspectSitesPanel({
  targetLat,
  targetLon,
  targetDepth,
  driftMeters,
  driftAxisLabel,
}: {
  targetLat: number
  targetLon: number
  targetDepth: number
  driftMeters: number
  driftAxisLabel: string
}) {
  const [env, setEnv] = useState<Set<EnvKey>>(new Set())
  const [landmarks, setLandmarks] = useState<Set<string>>(new Set())

  function toggleEnv(k: EnvKey) {
    setEnv((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleLandmark(id: string) {
    setLandmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedLandmarks = useMemo(
    () => LANDMARKS.filter((l) => landmarks.has(l.id)),
    [landmarks],
  )

  // Τα επιλεγμένα ορόσημα συνεισφέρουν αυτόματα χαρακτηριστικά εδάφους,
  // ώστε να επηρεάζουν και την ιεράρχηση των ύποπτων σημείων.
  const effectiveEnv = useMemo(() => {
    const merged = new Set(env)
    for (const l of selectedLandmarks) for (const e of l.env) merged.add(e)
    return merged
  }, [env, selectedLandmarks])

  // Βαθμολόγηση κάθε ύποπτου σημείου: βάση + ταιριάσματα περιβάλλοντος
  // (×2) − αντενδείξεις, με μικρό μπόνους μεθόδου ανάλογα με το βάθος.
  // Ρηχός/επιφανειακός στόχος → ευνοεί απόκρυψη· βαθύτερος → ευνοεί ταφή.
  const ranked = useMemo(() => {
    const shallow = targetDepth < 0.4
    const scored = SUSPECT_SPOTS.map((spot) => {
      let score = 1
      let matches = 0
      for (const f of spot.favors) if (effectiveEnv.has(f)) matches++
      score += matches * 2
      if (spot.disfavors) for (const d of spot.disfavors) if (effectiveEnv.has(d)) score -= 1
      if (spot.method === "concealment" && shallow) score += 1
      if (spot.method === "burial" && !shallow) score += 1
      // Η βύθιση είναι εγγενώς σπάνια — χωρίς νερό σχεδόν αποκλείεται.
      if (spot.method === "submersion" && !effectiveEnv.has("nearWater")) score -= 2
      return { spot, score: Math.max(0, score), matches }
    })
    scored.sort((a, b) => b.score - a.score)
    const maxScore = Math.max(1, ...scored.map((s) => s.score))
    return { scored, maxScore }
  }, [effectiveEnv, targetDepth])

  const shallow = targetDepth < 0.4
  const primaryMethod: Method = shallow ? "concealment" : "burial"

  return (
    <Panel
      step="9"
      title="Ύποπτα σημεία απόκρυψης στόχου"
      desc={
        <>
          Βάσει του εγχειριδίου <em>U.S. Army Special Forces Caching Techniques</em> (Κεφ. 1). Δήλωσε τα
          χαρακτηριστικά του εδάφους γύρω από το εκτιμώμενο σημείο-στόχο (§7) και η εφαρμογή ιεραρχεί τα σημεία που
          αξίζει να ελεγχθούν πρώτα.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Readout
          label="Εκτιμώμενο σημείο (§7)"
          value={`${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`}
          tone="phosphor"
        />
        <Readout label="Εκτ. βάθος στόχου" value={isFinite(targetDepth) ? targetDepth.toFixed(2) : "—"} unit="m" tone="brass" />
        <Readout
          label={`Ακτίνα ελέγχου (drift ${driftAxisLabel})`}
          value={isFinite(driftMeters) ? (driftMeters + 1).toFixed(1) : "—"}
          unit="m"
        />
      </div>

      {/* Προτεινόμενη μέθοδος απόκρυψης βάσει βάθους */}
      <div className="mt-4 rounded-sm border border-phosphor-dim/50 bg-secondary/30 px-3.5 py-3 font-mono text-[0.74rem] leading-relaxed text-muted-foreground">
        Προτεινόμενη μέθοδος προτεραιότητας:{" "}
        <span className={primaryMethod === "concealment" ? "text-brass" : "text-phosphor"}>
          {METHOD_LABEL[primaryMethod]}
        </span>{" "}
        {shallow
          ? "— ρηχό/επιφανειακό εκτιμώμενο βάθος υποδηλώνει απόκρυψη σε μόνιμο χαρακτηριστικό (τοίχο, κτίσμα, κοιλότητα)."
          : "— μεγαλύτερο βάθος υποδηλώνει ταφή· η ταφή προσφέρει διαρκή ασφάλεια και βρίσκεται σχεδόν παντού."}
      </div>

      {/* Χαρακτηριστικά περιβάλλοντος */}
      <fieldset className="mt-4">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Χαρακτηριστικά τοποθεσίας (επίλεξε όσα ισχύουν)
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ENV_OPTIONS.map((o) => {
            const active = env.has(o.key)
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleEnv(o.key)}
                className={
                  "flex flex-col items-start rounded-sm border px-2.5 py-2 text-left transition-colors " +
                  (active
                    ? "border-brass bg-secondary/50 text-phosphor"
                    : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
                }
              >
                <span className="font-mono text-[0.72rem] font-semibold">
                  {active ? "▸ " : ""}
                  {o.label}
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">{o.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Ορόσημα κοντά στην περιοχή έρευνας */}
      <fieldset className="mt-4">
        <legend className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Τι έχεις κοντά; (επίλεξε ορόσημα — η εφαρμογή υποδεικνύει πού να ψάξεις)
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANDMARKS.map((l) => {
            const active = landmarks.has(l.id)
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLandmark(l.id)}
                className={
                  "flex items-center gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors " +
                  (active
                    ? "border-brass bg-secondary/50 text-phosphor"
                    : "border-panel-line text-muted-foreground hover:border-brass-dim hover:text-foreground")
                }
              >
                <span
                  aria-hidden
                  className={
                    "inline-flex size-5 shrink-0 items-center justify-center font-mono text-[0.85rem] " +
                    (active ? "text-brass" : "text-muted-foreground")
                  }
                >
                  {l.icon}
                </span>
                <span className="font-mono text-[0.72rem] font-semibold leading-tight">{l.label}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Στοχευμένες υποδείξεις ανά επιλεγμένο ορόσημο */}
      {selectedLandmarks.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          <p className="font-mono text-[0.72rem] uppercase tracking-wide text-brass">
            Πού να ψάξεις γύρω από τα ορόσημα ({selectedLandmarks.length})
          </p>
          {selectedLandmarks.map((l) => (
            <div key={l.id} className="rounded-sm border border-brass-dim bg-readout px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-[0.8rem] text-foreground">
                  <span aria-hidden className="text-[0.9rem] text-brass">
                    {l.icon}
                  </span>
                  {l.label}
                </span>
                <span className="flex items-center gap-1.5">
                  {l.isReference && (
                    <span className="rounded-sm border border-panel-line px-1.5 py-0.5 font-mono text-[0.58rem] uppercase text-muted-foreground">
                      σημείο αναφοράς
                    </span>
                  )}
                  <span
                    className={
                      "rounded-sm border px-1.5 py-0.5 font-mono text-[0.62rem] uppercase " + METHOD_TONE[l.method]
                    }
                  >
                    {METHOD_LABEL[l.method]}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">{l.search}</p>
              <p className="mt-1.5 flex gap-1.5 font-mono text-[0.64rem] leading-relaxed">
                <span className="shrink-0 uppercase tracking-wide text-brass">Θέση:</span>
                <span className="text-foreground">{l.offset}</span>
              </p>
            </div>
          ))}
          <p className="font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
            Οι αποστάσεις είναι ενδεικτικές — μέτρησε πάντα από τη βάση του ορόσημου σε σταθερό αζιμούθιο και διασταύρωσε
            με την ακτίνα ελέγχου του drift παραπάνω.
          </p>
        </div>
      )}

      {/* Ιεραρχημένος κατάλογος ύποπτων σημείων */}
      <div className="mt-5 flex flex-col gap-2.5">
        <p className="flex items-center justify-between font-mono text-[0.72rem] uppercase tracking-wide text-muted-foreground">
          <span>Ύποπτα σημεία — κατά προτεραιότητα</span>
          <span className="text-[0.66rem] normal-case tracking-normal">
            {env.size === 0 ? "χωρίς φίλτρα — γενική σειρά" : `${env.size} ενεργά χαρακτηριστικά`}
          </span>
        </p>
        {ranked.scored.map(({ spot, score, matches }, i) => {
          const pct = (score / ranked.maxScore) * 100
          const isTop = i < 3 && score > 1
          return (
            <div
              key={spot.id}
              className={
                "rounded-sm border bg-readout px-3.5 py-3 " +
                (isTop ? "border-brass-dim" : "border-panel-line")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-[0.8rem] text-foreground">
                  <span
                    className={
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[0.62rem] " +
                      (isTop ? "border-brass text-brass" : "border-panel-line text-muted-foreground")
                    }
                  >
                    {i + 1}
                  </span>
                  {spot.name}
                </span>
                <span
                  className={"rounded-sm border px-1.5 py-0.5 font-mono text-[0.62rem] uppercase " + METHOD_TONE[spot.method]}
                >
                  {METHOD_LABEL[spot.method]}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">{spot.look}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-panel-line bg-panel">
                  <div
                    className={"h-full transition-all " + (isTop ? "bg-brass" : "bg-phosphor-dim")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[0.62rem] text-muted-foreground">
                  {matches > 0 ? `${matches}× ταίριασμα` : "βάση"}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Σημεία αναφοράς εντοπισμού */}
      <div className="mt-5 rounded-sm border border-panel-line bg-secondary/30 px-3.5 py-3">
        <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-wide text-brass">
          Σημεία αναφοράς για επιβεβαίωση θέσης (§1-5)
        </p>
        <p className="font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          Ένα σημείο απορρίπτεται αν δεν υπάρχουν διακριτά, μόνιμα ορόσημα σε μετρήσιμη απόσταση. Αναζήτησε στον χάρτη
          κοντά στο εκτιμώμενο σημείο:{" "}
          <span className="text-foreground">{REFERENCE_POINTS.join(" · ")}</span>.
        </p>
      </div>

      <p className="mt-3 font-mono text-[0.64rem] leading-relaxed text-muted-foreground">
        Ερμηνευτικός οδηγός εδάφους — δεν αποτελεί βεβαιότητα εντοπισμού. Η τελική επιλογή απαιτεί επιτόπια αυτοψία,
        όπως τονίζει το εγχειρίδιο.
      </p>
    </Panel>
  )
}
