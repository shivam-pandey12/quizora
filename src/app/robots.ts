import type { MetadataRoute } from "next";
import { buildCanonicalUrl, getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/quizzes", "/categories", "/leaderboard", "/rooms", "/pricing", "/privacy", "/terms", "/refund", "/contact"],
      disallow: [
        "/admin/",
        "/billing",
        "/billing/",
        "/upgrade",
        "/creator",
        "/creator/",
        "/classes",
        "/classes/",
        "/assignments",
        "/assignments/",
        "/dashboard",
        "/profile",
        "/play/",
        "/result/",
        "/rooms/create",
        "/rooms/join",
        "/rooms/history",
        "/rooms/challenge/",
        "/rooms/*/play",
        "/rooms/*/result",
        "/matchmaking/quick",
        "/matchmaking/status",
        "/api/"
      ]
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: getBaseUrl()
  };
}
