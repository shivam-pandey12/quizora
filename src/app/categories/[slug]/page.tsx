import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { FirestoreCategoryDetail } from "@/components/categories/firestore-category-detail";
import {
  getSeoPublicCategoryBySlug,
  isSeoFirebaseConfigured,
  listSeoPublicQuizzesByCategory
} from "@/lib/firestore/seo-content";
import {
  breadcrumbSchema,
  categoryPageSchema,
  publicMetadata,
  unavailableMetadata
} from "@/lib/seo";

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSeoFirebaseConfigured) {
    return publicMetadata({
      title: "Quiz Category",
      description: "Browse published Quizora quizzes by active category.",
      path: `/categories/${slug}`
    });
  }

  try {
    const category = await getSeoPublicCategoryBySlug(slug);
    if (!category) {
      return unavailableMetadata(
        "Category Not Available",
        "This Quizora category is missing or hidden."
      );
    }

    return publicMetadata({
      title: `${category.name} Quizzes`,
      description: category.description,
      path: `/categories/${category.slug}`
    });
  } catch {
    return unavailableMetadata(
      "Category Metadata Unavailable",
      "Quizora could not load public metadata for this category."
    );
  }
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;
  if (!isSeoFirebaseConfigured) return <FirestoreCategoryDetail slug={slug} />;

  const category = await getSeoPublicCategoryBySlug(slug).catch(() => null);
  if (!category) notFound();

  try {
    const quizzes = await listSeoPublicQuizzesByCategory(category.id);

    return (
      <>
        <JsonLd data={categoryPageSchema(category, quizzes)} />
        <JsonLd
          data={breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Categories", path: "/categories" },
            { name: category.name, path: `/categories/${category.slug}` }
          ])}
        />
        <Breadcrumbs
          items={[
            { label: "Categories", href: "/categories" },
            { label: category.name }
          ]}
        />
        <FirestoreCategoryDetail
          initialCategory={category}
          initialQuizzes={quizzes}
          slug={slug}
        />
      </>
    );
  } catch {
    return <FirestoreCategoryDetail initialCategory={category} slug={slug} />;
  }
}
