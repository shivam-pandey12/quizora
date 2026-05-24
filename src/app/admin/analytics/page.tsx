import type { Metadata } from "next";
import { AdminAnalytics } from "@/components/admin/admin-analytics";

export const metadata: Metadata = {
  title: "Admin Analytics",
  description: "Quizora admin analytics dashboard.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
