import type { Metadata } from "next";
import { AdminAttempts } from "@/components/admin/admin-attempts";

export const metadata: Metadata = {
  title: "Admin Attempts",
  description: "Quizora admin attempt review stream.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminAttemptsPage() {
  return <AdminAttempts />;
}
