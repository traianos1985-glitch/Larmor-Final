/* ============================================================
   ΓΕΩΔΕΔΟΜΕΝΑ ΠΕΡΙΟΧΗΣ — Υγρασία εδάφους & Μαγνητική ορυκτοποίηση
   ------------------------------------------------------------
   Όλα τα δεδομένα εδώ είναι ΠΡΑΓΜΑΤΙΚΑ, από δωρεάν υπηρεσίες χωρίς κλειδί,
   που καλούνται απευθείας από τον browser (CORS: *), ώστε να δουλεύουν και
   σε στατικό GitHub Pages:

   • Υγρασία εδάφους  → Open-Meteo  (soil_moisture_0_to_1cm, m³/m³)
   • Μαγνητική ανωμαλία φλοιού → NOAA/NCEI EMAG2 v3 (nT), δηλαδή ΑΜΕΣΟΣ δείκτης
     μαγνητικής ορυκτοποίησης του υπεδάφους (magnetite/σίδηρος) — η ίδια η
     πηγή του «μαγνητικού θορύβου εδάφους».

   ΤΙΜΙΟΤΗΤΑ:
   - Η υγρασία & η ανωμαλία είναι ΜΕΤΡΗΣΕΙΣ.
   - Ο «προτεινόμενος τύπος εδάφους» είναι ΠΑΡΑΓΩΓΗ ΕΚΤΙΜΗΣΗ από την υγρασία
     (υγρότερο έδαφος → μεγαλύτερη αγωγιμότητα σ) και ΕΠΙΣΗΜΑΙΝΕΤΑΙ ρητά ως
     πρόταση, όχι ως μέτρηση σύστασης εδάφους. Ο χρήστης την εφαρμόζει με κουμπί.
   - Η ανάλυση του EMAG2 είναι ~3.7 km (2 arc-min): κατάλληλη για «σε ποια
     περιοχή είσαι», όχι για ακρίβεια μέτρου.
============================================================ */

export interface SoilMoistureResult {
  /** Ογκομετρική υγρασία επιφάνειας 0–1 cm (m³/m³) */
  vwcSurface: number
  /** Ογκομετρική υγρασία 1–3 cm (m³/m³), αν διαθέσιμη */
  vwcShallow: number | null
  time: string
  source: string
}

/** Πραγματική επιφανειακή υγρασία εδάφους από Open-Meteo (δωρεάν, χωρίς κλειδί). */
export async function fetchSoilMoisture(lat: number, lon: number): Promise<SoilMoistureResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm&timezone=auto`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`)
  const data = await res.json()
  const cur = data?.current
  const vwcSurface = Number(cur?.soil_moisture_0_to_1cm)
  if (!Number.isFinite(vwcSurface)) return null
  const vwcShallow = Number(cur?.soil_moisture_1_to_3cm)
  return {
    vwcSurface,
    vwcShallow: Number.isFinite(vwcShallow) ? vwcShallow : null,
    time: String(cur?.time ?? ""),
    source: "Open-Meteo",
  }
}

export interface MagneticAnomalyResult {
  /** Ανωμαλία στη στάθμη θάλασσας (nT) — καταλληλότερη για δέκτη στο έδαφος */
  seaLevelNt: number
  /** Ανωμαλία με upward continuation ~4 km (nT) */
  upContNt: number | null
  /** Αβεβαιότητα EMAG2 (nT) */
  errorNt: number | null
  source: string
}

/** Μαγνητική ανωμαλία φλοιού από NOAA EMAG2 v3 (ImageServer identify, δωρεάν, χωρίς κλειδί). */
export async function fetchMagneticAnomaly(lat: number, lon: number): Promise<MagneticAnomalyResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const geometry = encodeURIComponent(JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }))
  const url =
    `https://gis.ngdc.noaa.gov/arcgis/rest/services/EMAG2v3/ImageServer/identify` +
    `?geometry=${geometry}&geometryType=esriGeometryPoint&returnGeometry=false&f=json`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`NOAA EMAG2 returned ${res.status}`)
  const data = await res.json()
  // properties.Values = [UpCont nT, SeaLevel nT, Error nT]
  const values: string[] = data?.properties?.Values ?? []
  const num = (s: unknown) => {
    const v = Number(s)
    return Number.isFinite(v) ? v : null
  }
  const upCont = num(values[0])
  const seaLevel = num(values[1])
  const error = num(values[2])
  const primary = seaLevel ?? upCont ?? num(data?.value)
  if (primary == null) return null
  return { seaLevelNt: primary, upContNt: upCont, errorNt: error, source: "NOAA EMAG2 v3" }
}

/* ---------- Αντιστοίχιση υγρασίας → τύπος εδάφους (πρόταση) ----------
   Οι κατώφλια βασίζονται στη σχέση υγρασίας–αγωγιμότητας: όσο υγρότερο το
   έδαφος, τόσο μεγαλύτερο σ. Επιστρέφει value που αντιστοιχεί ΑΚΡΙΒΩΣ σε ένα
   από τα υπάρχοντα SOIL_TYPES της εφαρμογής (δεν εφευρίσκει νέο σ). */
export function suggestSoilFromMoisture(vwc: number): { value: string; note: string } {
  if (!Number.isFinite(vwc)) return { value: "0.01", note: "μη διαθέσιμη υγρασία — προεπιλογή" }
  if (vwc < 0.05) return { value: "0.0001", note: "πολύ ξηρό/βραχώδες έδαφος" }
  if (vwc < 0.12) return { value: "0.001", note: "ξηρό/αμμώδες έδαφος" }
  if (vwc < 0.25) return { value: "0.01", note: "μέτρια υγρό έδαφος" }
  if (vwc < 0.38) return { value: "0.05", note: "υγρό/αργιλώδες έδαφος" }
  return { value: "0.1", note: "κορεσμένο/βαλτώδες έδαφος" }
}

/** Αντίστοιχο έδαφος διάθλασης (ε_r|σ) με βάση την ίδια πρόταση υγρασίας. */
export function suggestRefractionSoilFromMoisture(vwc: number): string {
  if (!Number.isFinite(vwc)) return "10|0.01"
  if (vwc < 0.12) return "4|0.001"
  if (vwc < 0.28) return "10|0.01"
  return "25|0.05"
}

/* ---------- Βαθμίδα μαγνητικής ορυκτοποίησης από |ανωμαλία| ---------- */
export interface MineralizationTier {
  level: "low" | "med" | "high" | "veryhigh"
  label: string
  tone: "phosphor" | "brass" | "destructive"
  /** true αν το |A| είναι μικρότερο από την αβεβαιότητα EMAG2 (πρακτικά αμελητέο) */
  withinNoise: boolean
}

export function mineralizationTier(anomalyNt: number, errorNt: number | null = null): MineralizationTier {
  const a = Math.abs(anomalyNt)
  const withinNoise = errorNt != null && a < errorNt
  let level: MineralizationTier["level"]
  let label: string
  let tone: MineralizationTier["tone"]
  if (a < 50) {
    level = "low"
    label = "χαμηλή μαγνητική ορυκτοποίηση"
    tone = "phosphor"
  } else if (a < 150) {
    level = "med"
    label = "μέτρια μαγνητική ορυκτοποίηση"
    tone = "brass"
  } else if (a < 300) {
    level = "high"
    label = "υψηλή μαγνητική ορυκτοποίηση"
    tone = "destructive"
  } else {
    level = "veryhigh"
    label = "πολύ υψηλή μαγνητική ορυκτοποίηση"
    tone = "destructive"
  }
  return { level, label, tone, withinNoise }
}
