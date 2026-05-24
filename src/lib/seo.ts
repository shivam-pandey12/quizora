import type { Metadata, MetadataRoute } from "next";
import type { Category, Quiz } from "@/types/domain";

export const siteName = "Quizora";
export const defaultTitle = "Quizora — Play, Compete, and Master Quizzes";
export const defaultDescription =
  "Play premium quizzes, join live quiz rooms, compete on leaderboards, and track your progress on Quizora.";

export const noindexRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false
  }
} satisfies Metadata["robots"];

function normalizeBaseUrl(value?: string) {
  const fallback = "http://localhost:3000";
  if (!value) return fallback;
  try {
    return new URL(value).origin;
  } catch {
    return fallback;
  }
}

export function getBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function buildCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getBaseUrl()).toString();
}

export function trimDescription(value: string | null | undefined, fallback = defaultDescription) {
  const normalized = (value || fallback).replace(/\s+/g, " ").trim();
  if (normalized.length <= 158) return normalized;
  return `${normalized.slice(0, 155).replace(/\s+\S*$/, "")}...`;
}

export function defaultOgImage() {
  return buildCanonicalUrl("/opengraph-image");
}

export function safeOgImage(imageUrl?: string | null) {
  if (!imageUrl) return defaultOgImage();
  try {
    return new URL(imageUrl, getBaseUrl()).toString();
  } catch {
    return defaultOgImage();
  }
}

export function publicMetadata({
  title,
  description,
  path,
  image,
  type = "website"
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const canonical = buildCanonicalUrl(path);
  const cleanedDescription = trimDescription(description);
  const imageUrl = safeOgImage(image);

  return {
    title,
    description: cleanedDescription,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description: cleanedDescription,
      url: canonical,
      siteName,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} preview`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanedDescription,
      images: [imageUrl]
    }
  };
}

export function unavailableMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: noindexRobots
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: buildCanonicalUrl("/"),
    description: defaultDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${buildCanonicalUrl("/quizzes")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function appSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: buildCanonicalUrl("/"),
    description: defaultDescription
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path)
    }))
  };
}

export function collectionSchema({
  title,
  description,
  path,
  items
}: {
  title: string;
  description: string;
  path: string;
  items?: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: trimDescription(description),
    url: buildCanonicalUrl(path),
    mainEntity: items?.length
      ? {
          "@type": "ItemList",
          itemListElement: items.slice(0, 20).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            url: buildCanonicalUrl(item.path)
          }))
        }
      : undefined
  };
}

export function quizPageSchema(quiz: Quiz) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: quiz.title,
    description: trimDescription(quiz.shortDescription || quiz.description),
    url: buildCanonicalUrl(`/quizzes/${quiz.slug}`),
    about: {
      "@type": "Thing",
      name: `${quiz.categoryName} quiz`
    },
    educationalLevel: quiz.difficulty,
    timeRequired: `PT${Math.max(1, quiz.estimatedMinutes)}M`
  };
}

export function categoryPageSchema(category: Category, quizzes: Quiz[]) {
  return collectionSchema({
    title: `${category.name} quizzes`,
    description: category.description,
    path: `/categories/${category.slug}`,
    items: quizzes.map((quiz) => ({
      name: quiz.title,
      path: `/quizzes/${quiz.slug}`
    }))
  });
}

export function sitemapEntry(
  path: string,
  options: Omit<MetadataRoute.Sitemap[number], "url"> = {}
): MetadataRoute.Sitemap[number] {
  return {
    url: buildCanonicalUrl(path),
    ...options
  };
}
