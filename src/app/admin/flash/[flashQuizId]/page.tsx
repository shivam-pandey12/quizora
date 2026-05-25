import type { Metadata } from "next";
import { AdminFlashDetailPage } from "@/components/admin/admin-flash";

export const metadata: Metadata = {
  title: "Admin Flash Quiz Detail",
  description: "Review a temporary Quizora Flash Quiz.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminFlashDetailRoutePage({ params }: { params: Promise<{ flashQuizId: string }> }) {
  const { flashQuizId } = await params;
  return <AdminFlashDetailPage flashQuizId={flashQuizId} />;
}
