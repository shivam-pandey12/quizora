import type { Metadata } from "next";
import { QuizManager } from "@/components/admin/quiz-manager";

export const metadata: Metadata = {
  title: "Admin Quizzes",
  description: "Quizora quiz manager.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminQuizzesPage() {
  return <QuizManager />;
}
