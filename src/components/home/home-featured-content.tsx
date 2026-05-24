"use client";

import { AlertTriangle, Database } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryCard } from "@/components/quizzes/category-card";
import { QuizCard } from "@/components/quizzes/quiz-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { sampleCategories, sampleQuizzes } from "@/data/sample-data";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories, listPublicQuizzes } from "@/lib/firestore/content";
import type { CategoryCardItem, QuizCardItem } from "@/types/domain";

export function HomeFeaturedContent() {
  const [quizzes, setQuizzes] = useState<QuizCardItem[]>(sampleQuizzes);
  const [categories, setCategories] = useState<CategoryCardItem[]>(sampleCategories);
  const [setupMode, setSetupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      if (!isFirebaseConfigured) {
        setSetupMode(true);
        return;
      }

      try {
        const [nextQuizzes, nextCategories] = await Promise.all([
          listPublicQuizzes(),
          listPublicCategories()
        ]);
        setQuizzes(nextQuizzes.length ? nextQuizzes : []);
        setCategories(nextCategories.length ? nextCategories : []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load starter content.");
      }
    }

    void loadContent();
  }, []);

  const featuredQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => quiz.isFeatured)
        .concat(quizzes.filter((quiz) => !quiz.isFeatured))
        .slice(0, 6),
    [quizzes]
  );

  const featuredCategories = useMemo(
    () =>
      categories
        .filter((category) => category.featured)
        .concat(categories.filter((category) => !category.featured))
        .slice(0, 6),
    [categories]
  );

  return (
    <>
      {setupMode ? (
        <section className="container-page pb-2 pt-8">
          <EmptyState
            icon={Database}
            title="Starter content preview"
            description={`${firebaseSetupMessage} These are non-production preview cards. Run the starter seed to publish real Firestore content.`}
          />
        </section>
      ) : null}

      {error ? (
        <section className="container-page pb-2 pt-8">
          <EmptyState icon={AlertTriangle} title="Starter content could not load" description={error} />
        </section>
      ) : null}

      <section className="container-page py-12">
        <SectionHeader
          eyebrow="Featured"
          title="Published starter quizzes"
          description="Featured quiz surfaces highlight difficulty, time, points, and the clear path into play."
        />
        {featuredQuizzes.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {featuredQuizzes.slice(0, 3).map((quiz) => (
              <QuizCard featured key={quiz.id ?? quiz.slug} quiz={quiz} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No featured quizzes yet"
            description="Run the starter content seed to publish the first premium Quizora quizzes."
          />
        )}
      </section>

      <section className="container-page py-12">
        <SectionHeader
          eyebrow="Categories"
          title="Mastery lanes for every kind of player"
          description="Browse focused quiz lanes, then drill into published quizzes that match your mood and skill level."
        />
        {featuredCategories.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map((category) => (
              <CategoryCard category={category} key={category.id ?? category.slug} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No featured categories yet"
            description="Run the starter content seed to add active public categories."
          />
        )}
      </section>
    </>
  );
}
