import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = {
  title: "Admin",
  description: "Quizora admin dashboard.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminOverviewPage() {
  return <AdminOverview />;
}
