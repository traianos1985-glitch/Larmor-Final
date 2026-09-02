import type { MetadataRoute } from "next"

export const dynamic = "force-static"

const siteUrl = "https://traianos1985-glitch.github.io/Larmor-Final"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
