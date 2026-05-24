import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { QuizPlayer } from "@/components/play/quiz-player";

interface PlayPageProps {
  params: Promise<{ quizId: string }>;
}

export const metadata: Metadata = {
  title: "Play Quiz",
  description: "Login-required Quizora play engine.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { quizId } = await params;
  return (
    <Suspense fallback={<div className="container-page py-12"><LoadingSkeleton variant="page" /></div>}>
      <QuizPlayer quizId={quizId} />
    </Suspense>
  );
}
