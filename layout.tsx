import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "leaflet/dist/leaflet.css"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-inter" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "greek"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "Larmor & Αρμονικές — Υπολογιστής Συχνοτήτων Μετάλλων",
  description:
    "Υπολογισμός συχνότητας συντονισμού Larmor, αρμονικών, βάθους διείσδυσης (skin depth) και μοντέλου διάθλασης σήματος για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο NOAA WMM.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#12181b",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="el"
      className={`bg-background ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
