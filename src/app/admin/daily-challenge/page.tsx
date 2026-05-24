import type { Metadata } from "next";
import { AdminDailyChallenge } from "@/components/admin/admin-daily-challenge";

export const metadata: Metadata = {
  title: "Admin Daily Challenge",
  description: "Quizora daily challenge control.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminDailyChallengePage() {
  return <AdminDailyChallenge />;
}
