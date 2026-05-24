import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/docs-components";
import { JsonLd } from "@/components/seo/json-ld";
import { docPageSlugs, getDocBySlug } from "@/lib/docs/content";
import { breadcrumbSchema, buildCanonicalUrl, publicMetadata } from "@/lib/seo";

interface DocsArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return docPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: DocsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocBySlug(slug);

  if (!page) {
    return publicMetadata({
      title: "Quizora documentation",
      description: "Quizora documentation and help center.",
      path: "/docs"
    });
  }

  return publicMetadata({
    title: page.title,
    description: page.description,
    path: `/docs/${page.slug}`,
    type: "article"
  });
}

export default async function DocsArticlePage({ params }: DocsArticlePageProps) {
  const { slug } = await params;
  const page = getDocBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: page.title,
          description: page.description,
          url: buildCanonicalUrl(`/docs/${page.slug}`),
          dateModified: page.updatedAt,
          publisher: {
            "@type": "Organization",
            name: "Quizora"
          }
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: page.title, path: `/docs/${page.slug}` }
        ])}
      />
      <DocsArticle page={page} />
    </>
  );
}

