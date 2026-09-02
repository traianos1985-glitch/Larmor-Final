import { AppHeader } from "@/components/larmor/app-header"
import { Calculator } from "@/components/larmor/calculator"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 md:px-6 md:py-10">
      <AppHeader />

      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
        Υπολογισμός συχνότητας Larmor{" "}
        <span className="font-mono text-foreground">f = γ · B</span> για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο,
        αρμονικές, βάθος διείσδυσης και μοντέλο διάθλασης. Η τελική χαρτογράφηση και ο τριγωνισμός βρίσκονται στη σελίδα{" "}
        <span className="text-brass">«Χαρτογράφηση»</span>.
      </p>

      <Calculator />

      <footer className="mt-2 flex flex-col gap-2 border-t border-panel-line pt-5 text-xs leading-relaxed text-muted-foreground">
        <p className="text-pretty">
          <span className="font-semibold text-brass">Επιστημονική σημείωση:</span> Οι συχνότητες Larmor και οι
          υπολογισμοί ηλεκτρομαγνητισμού βασίζονται σε καθιερωμένη φυσική. Η χρήση τους ως{" "}
          <em>μέθοδος ανίχνευσης μετάλλων εξ αποστάσεως είναι πειραματική</em> και δεν έχει επιβεβαιωθεί από
          ανεξάρτητη έρευνα. Τα αποτελέσματα προορίζονται για εκπαιδευτική και διερευνητική χρήση.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider">
          Γεωμαγνητικό μοντέλο: NOAA WMM (με offline dipole fallback) · Ακρίβεια IEEE-754 double precision
        </p>
      </footer>
    </main>
  )
}
