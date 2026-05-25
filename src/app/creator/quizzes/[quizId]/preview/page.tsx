import { CreatorQuizPreviewPage } from "@/components/creator/creator-quiz-pages";

interface CreatorQuizPreviewRouteProps {
  params: Promise<{ quizId: string }>;
}

export default async function CreatorQuizPreviewRoute({ params }: CreatorQuizPreviewRouteProps) {
  const { quizId } = await params;
  return <CreatorQuizPreviewPage quizId={quizId} />;
}
