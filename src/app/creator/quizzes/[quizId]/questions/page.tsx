import { CreatorQuizQuestionsPage } from "@/components/creator/creator-quiz-pages";

interface CreatorQuizQuestionsRouteProps {
  params: Promise<{ quizId: string }>;
}

export default async function CreatorQuizQuestionsRoute({ params }: CreatorQuizQuestionsRouteProps) {
  const { quizId } = await params;
  return <CreatorQuizQuestionsPage quizId={quizId} />;
}
