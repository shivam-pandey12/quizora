import type { Metadata } from "next";
import { AdminQuestions } from "@/components/admin/admin-questions";

export const metadata: Metadata = {
  title: "Admin Questions",
  description: "Quizora question quality manager.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminQuestionsPage() {
  return <AdminQuestions />;
}
