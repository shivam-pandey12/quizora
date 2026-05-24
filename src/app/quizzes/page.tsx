import type { Metadata } from "next";
import { Suspense } from "react";
import { FirestoreQuizExplorer } from "@/components/quizzes/firestore-quiz-explorer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Browse Quizzes",
    description:
      "Browse published Quizora quizzes by category, difficulty, points, and time, then start solo play or challenge friends.",
    path: "/quizzes"
  })
};

export default function QuizzesPage() {
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: "Browse Quizora quizzes",
          description:
            "A public collection of published Quizora quizzes for solo play, live rooms, and leaderboard competition.",
          path: "/quizzes"
        })}
      />
      <Breadcrumbs items={[{ label: "Quizzes" }]} />
      <PageHeader
        eyebrow="Quiz library"
        title="Browse published Quizora quizzes"
        description="Search, filter, and sort public quizzes by category, difficulty, time, and points. Start a quiz when you are ready to save an attempt and review your answers."
      />
      <section className="container-page pb-16">
        <Suspense fallback={<LoadingSkeleton variant="page" />}>
          <FirestoreQuizExplorer />
        </Suspense>
      </section>
    </>
  );
}
