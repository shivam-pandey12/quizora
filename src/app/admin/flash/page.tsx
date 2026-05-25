import type { Metadata } from "next";
import { AdminFlashPage } from "@/components/admin/admin-flash";

export const metadata: Metadata = {
  title: "Admin Flash Quizzes",
  description: "Monitor temporary Quizora Flash Quizzes.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFlashRoutePage() {
  return <AdminFlashPage />;
}
