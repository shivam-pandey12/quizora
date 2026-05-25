import type { Metadata } from "next";
import { AdminCreatorQuizzesPage } from "@/components/admin/admin-creator-review";

export const metadata: Metadata = {
  title: "Admin Creator Quizzes",
  description: "Review Quizora creator quiz submissions.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminCreatorQuizzesRoute() {
  return <AdminCreatorQuizzesPage />;
}
