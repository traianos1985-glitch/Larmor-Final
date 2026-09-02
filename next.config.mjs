/** @type {import('next').NextConfig} */

// Το repo όνομα για GitHub Pages: https://USER.github.io/Larmor-Final/
// Το basePath/assetPrefix εφαρμόζονται ΜΟΝΟ στο production build (GitHub Actions),
// ώστε το preview/dev (root) να συνεχίζει να λειτουργεί κανονικά.
const repoName = "Larmor-Final"
const isProd = process.env.NODE_ENV === "production"

const nextConfig = {
  // Στατικό export (HTML/JS/CSS) — απαραίτητο για GitHub Pages (χωρίς Node server).
  output: "export",
  // Το GitHub Pages σερβίρει τα assets κάτω από /<repo>/ στο production.
  basePath: isProd ? `/${repoName}` : undefined,
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
