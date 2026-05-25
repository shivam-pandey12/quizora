import { CreatorQuizFormPage } from "@/components/creator/creator-quiz-pages";

interface CreatorQuizEditRouteProps {
  params: Promise<{ quizId: string }>;
}

export default async function CreatorQuizEditRoute({ params }: CreatorQuizEditRouteProps) {
  const { quizId } = await params;
  return <CreatorQuizFormPage quizId={quizId} />;
}
