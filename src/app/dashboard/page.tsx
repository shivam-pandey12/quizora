import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Protected Quizora user dashboard.",
  robots: {
    index: false,
    follow: false
  }
};

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardContent />
    </DashboardShell>
  );
}
