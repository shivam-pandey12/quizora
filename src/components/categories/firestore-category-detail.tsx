"use client";

import { AlertTriangle, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryCard } from "@/components/quizzes/category-card";
import { QuizCard } from "@/components/quizzes/quiz-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { getPublicCategoryBySlug, listPublicQuizzesByCategory } from "@/lib/firestore/content";
import { sampleCategories, sampleQuizzes } from "@/data/sample-data";
import type { CategoryCardItem, QuizCardItem } from "@/types/domain";

export function FirestoreCategoryDetail({
  slug,
  initialCategory,
  initialQuizzes = []
}: {
  slug: string;
  initialCategory?: CategoryCardItem | null;
  initialQuizzes?: QuizCardItem[];
}) {
  const [category, setCategory] = useState<CategoryCardItem | null>(initialCategory ?? null);
  const [quizzes, setQuizzes] = useState<QuizCardItem[]>(initialQuizzes);
  const [loading, setLoading] = useState(!initialCategory);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    if (initialCategory) return;

    async function load() {
      if (!isFirebaseConfigured) {
        const fallback = sampleCategories.find((item) => item.slug === slug) ?? null;
        setCategory(fallback);
        setQuizzes(sampleQuizzes.filter((item) => item.categorySlug === slug));
        setSetupMode(true);
        setLoading(false);
        return;
      }

      try {
        const nextCategory = await getPublicCategoryBySlug(slug);
        setCategory(nextCategory);
        if (nextCategory?.id) {
          setQuizzes(await listPublicQuizzesByCategory(nextCategory.id));
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load this category.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [initialCategory, slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={AlertTriangle} title="Category could not load" description={error} />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Category is not available"
          description="This category is missing or hidden. Only active categories are public."
          actionHref="/categories"
          actionLabel="Browse categories"
        />
      </div>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden py-10 sm:py-14">
        <div className="absolute inset-0 premium-grid opacity-60" />
        <div className="container-page relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Category</p>
            <h1 className="mt-3 text-balance text-5xl font-semibold">{category.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {category.description}
            </p>
          </div>
          <CategoryCard category={category} />
        </div>
      </section>
      {setupMode ? (
        <section className="container-page pb-8">
          <EmptyState
            icon={Database}
            title="Firebase is not configured yet"
            description={`${firebaseSetupMessage} Showing sample category content for review.`}
          />
        </section>
      ) : null}
      <section className="container-page pb-16">
        <SectionHeader
          title="Published quizzes in this category"
          description="Only published public quizzes from Firestore are listed here."
        />
        {quizzes.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id ?? quiz.slug} quiz={quiz} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published quizzes yet"
            description="Once an admin publishes quizzes in this category, they will appear here."
          />
        )}
      </section>
    </>
  );
}
