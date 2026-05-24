import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProfileContent } from "@/components/profile/profile-content";

export const metadata: Metadata = {
  title: "Profile",
  description: "Protected Quizora profile and progress.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ProfilePage() {
  return (
    <DashboardShell>
      <ProfileContent />
    </DashboardShell>
  );
}
