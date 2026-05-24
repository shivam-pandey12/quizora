import type { MetadataRoute } from "next";
import {
  isSeoFirebaseConfigured,
  listSeoPublicCategories,
  listSeoPublicQuizzes
} from "@/lib/firestore/seo-content";
import { publicDocPages } from "@/lib/docs/content";
import { sitemapEntry } from "@/lib/seo";

export const revalidate = 3600;

const staticEntries: MetadataRoute.Sitemap = [
  sitemapEntry("/", { changeFrequency: "weekly", priority: 1 }),
  sitemapEntry("/quizzes", { changeFrequency: "daily", priority: 0.9 }),
  sitemapEntry("/categories", { changeFrequency: "weekly", priority: 0.8 }),
  sitemapEntry("/leaderboard", { changeFrequency: "hourly", priority: 0.6 }),
  sitemapEntry("/rooms", { changeFrequency: "hourly", priority: 0.6 }),
  sitemapEntry("/pricing", { changeFrequency: "weekly", priority: 0.7 }),
  sitemapEntry("/docs", { changeFrequency: "weekly", priority: 0.7 }),
  ...publicDocPages.map((page) =>
    sitemapEntry(`/docs/${page.slug}`, {
      changeFrequency: "monthly",
      priority: 0.55,
      lastModified: page.updatedAt
    })
  ),
  sitemapEntry("/privacy", { changeFrequency: "yearly", priority: 0.2 }),
  sitemapEntry("/terms", { changeFrequency: "yearly", priority: 0.2 }),
  sitemapEntry("/refund", { changeFrequency: "yearly", priority: 0.2 }),
  sitemapEntry("/contact", { changeFrequency: "yearly", priority: 0.2 })
];

function withTimeout<T>(promise: Promise<T>, ms = 2500) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Sitemap Firestore fetch timed out.")), ms);
    })
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isSeoFirebaseConfigured) return staticEntries;

  try {
    const [quizzes, categories] = await withTimeout(
      Promise.all([listSeoPublicQuizzes(), listSeoPublicCategories()])
    );

    return [
      ...staticEntries,
      ...quizzes.map((quiz) =>
        sitemapEntry(`/quizzes/${quiz.slug}`, {
          changeFrequency: "weekly",
          priority: 0.8,
          lastModified: quiz.updatedAt || quiz.publishedAt || undefined
        })
      ),
      ...categories.map((category) =>
        sitemapEntry(`/categories/${category.slug}`, {
          changeFrequency: "weekly",
          priority: 0.7,
          lastModified: category.updatedAt || undefined
        })
      )
    ];
  } catch {
    return staticEntries;
  }
}
