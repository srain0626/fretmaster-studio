import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: "2026-11-24",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/studio`,
      lastModified: "2026-11-24",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
