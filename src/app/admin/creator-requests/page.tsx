import type { Metadata } from "next";
import { AdminCreatorRequestsPage } from "@/components/admin/admin-creator-review";

export const metadata: Metadata = {
  title: "Admin Creator Requests",
  description: "Review Quizora creator access requests.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminCreatorRequestsRoute() {
  return <AdminCreatorRequestsPage />;
}
