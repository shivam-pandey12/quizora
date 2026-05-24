import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/admin-reports";

export const metadata: Metadata = {
  title: "Admin Reports",
  description: "Quizora reports workflow.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminReportsPage() {
  return <AdminReports />;
}
