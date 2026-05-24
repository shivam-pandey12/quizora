import type { Metadata } from "next";
import { AdminFeedback } from "@/components/admin/admin-feedback";

export const metadata: Metadata = {
  title: "Admin Feedback",
  description: "Quizora feedback workflow.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFeedbackPage() {
  return <AdminFeedback />;
}
