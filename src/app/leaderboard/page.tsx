import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardPageClient } from "@/components/leaderboard/leaderboard-page";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Quizora Leaderboard",
    description:
      "Explore public Quizora leaderboard rankings across global, quiz, and category views for all-time, daily, weekly, and monthly periods.",
    path: "/leaderboard"
  })
};

export default function LeaderboardPage() {
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: "Quizora leaderboard",
          description:
            "Public leaderboard rankings for Quizora quiz performance, accuracy, speed, and points.",
          path: "/leaderboard"
        })}
      />
      <Breadcrumbs items={[{ label: "Leaderboard" }]} />
      <Suspense
        fallback={
          <div className="container-page py-12">
            <LoadingSkeleton variant="page" />
          </div>
        }
      >
        <LeaderboardPageClient />
      </Suspense>
    </>
  );
}
