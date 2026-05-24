import type { Metadata } from "next";
import { QuestionManager } from "@/components/admin/question-manager";

interface QuestionManagerPageProps {
  params: Promise<{ quizId: string }>;
}

export const metadata: Metadata = {
  title: "Quiz Questions",
  description: "Manage Quizora quiz questions.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function QuestionManagerPage({ params }: QuestionManagerPageProps) {
  const { quizId } = await params;
  return <QuestionManager quizId={quizId} />;
}
