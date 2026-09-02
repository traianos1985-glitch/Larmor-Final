import type { MetadataRoute } from "next"

export const dynamic = "force-static"

const siteUrl = "https://traianos1985-glitch.github.io/Larmor-Final"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
