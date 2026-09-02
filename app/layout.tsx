import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "leaflet/dist/leaflet.css"
import "./globals.css"
import { LarmorSessionProvider } from "@/components/larmor/session-context"

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-inter" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "greek"], variable: "--font-jetbrains" })

const siteUrl = "https://traianos1985-glitch.github.io/Larmor-Final"
const ogImage = `${siteUrl}/og-image.png`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Larmor & Αρμονικές — Υπολογιστής Συχνοτήτων Μετάλλων",
    template: "%s — Larmor & Αρμονικές",
  },
  description:
    "Υπολογισμός συχνότητας συντονισμού Larmor, αρμονικών, βάθους διείσδυσης (skin depth) και μοντέλου διάθλασης σήματος για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο NOAA WMM.",
  applicationName: "Larmor & Αρμονικές",
  generator: "v0.app",
  keywords: [
    "Larmor",
    "συχνότητα Larmor",
    "συχνότητα συντονισμού",
    "αρμονικές",
    "skin depth",
    "βάθος διείσδυσης",
    "γυρομαγνητικός λόγος",
    "γεωμαγνητικό πεδίο",
    "NOAA WMM",
    "μέταλλα",
    "διάθλαση σήματος",
    "physics calculator",
  ],
  authors: [{ name: "Larmor & Αρμονικές" }],
  creator: "Larmor & Αρμονικές",
  publisher: "Larmor & Αρμονικές",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    url: siteUrl,
    siteName: "Larmor & Αρμονικές",
    title: "Larmor & Αρμονικές — Υπολογιστής Συχνοτήτων Μετάλλων",
    description:
      "Υπολογισμός συχνότητας συντονισμού Larmor, αρμονικών, βάθους διείσδυσης (skin depth) και μοντέλου διάθλασης σήματος για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο NOAA WMM.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Larmor & Αρμονικές — Υπολογιστής Συχνοτήτων Μετάλλων",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Larmor & Αρμονικές — Υπολογιστής Συχνοτήτων Μετάλλων",
    description:
      "Υπολογισμός συχνότητας συντονισμού Larmor, αρμονικών, βάθους διείσδυσης (skin depth) και μοντέλου διάθλασης σήματος για κοινά μέταλλα, με ζωντανό γεωμαγνητικό πεδίο NOAA WMM.",
    images: [ogImage],
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
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
        <LarmorSessionProvider>{children}</LarmorSessionProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
