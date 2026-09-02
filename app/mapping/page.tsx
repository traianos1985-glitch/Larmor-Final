import type { Metadata } from "next"
import { AppHeader } from "@/components/larmor/app-header"
import { MappingView } from "@/components/larmor/mapping-view"

export const metadata: Metadata = {
  title: "Χαρτογράφηση & Τριγωνισμός",
  description:
    "Τελική πειραματική χαρτογράφηση θέσης στόχου και τριγωνισμός πολλαπλών μετρήσεων με ζώνη αβεβαιότητας 95%.",
  alternates: {
    canonical: "/mapping",
  },
}

export default function MappingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 md:px-6 md:py-10">
      <AppHeader />

      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
        Τελική χαρτογράφηση και τριγωνισμός. Οι τιμές συγχρονίζονται αυτόματα με τον{" "}
        <span className="text-brass">«Υπολογιστή»</span> (υλικό, πεδίο, επιλεγμένη συχνότητα και συντεταγμένες).
      </p>

      <MappingView />

      <footer className="mt-2 flex flex-col gap-2 border-t border-panel-line pt-5 text-xs leading-relaxed text-muted-foreground">
        <p className="text-pretty">
          <span className="font-semibold text-brass">Επιστημονική σημείωση:</span> Η απόσταση, η διόπτευση και η
          εκτίμηση θέσης είναι <em>πειραματικές</em> και δεν έχουν επιβεβαιωθεί από ανεξάρτητη έρευνα. Προορίζονται
          για εκπαιδευτική και διερευνητική χρήση.
        </p>
      </footer>
    </main>
  )
}
