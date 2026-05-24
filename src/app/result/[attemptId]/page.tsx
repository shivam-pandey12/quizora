import type { Metadata } from "next";
import { ResultView } from "@/components/results/result-view";

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export const metadata: Metadata = {
  title: "Quiz Result",
  description: "Private Quizora attempt result and answer review.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ResultPage({ params }: ResultPageProps) {
  const { attemptId } = await params;
  return <ResultView attemptId={attemptId} />;
}
