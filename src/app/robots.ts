import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: "https://fretmaster-studio.vercel.app/sitemap.xml",
    host: "https://fretmaster-studio.vercel.app",
  };
}
