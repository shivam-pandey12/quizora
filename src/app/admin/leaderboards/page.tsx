import type { Metadata } from "next";
import { AdminLeaderboards } from "@/components/admin/admin-leaderboards";

export const metadata: Metadata = {
  title: "Admin Leaderboards",
  description: "Quizora leaderboard moderation.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLeaderboardsPage() {
  return <AdminLeaderboards />;
}
