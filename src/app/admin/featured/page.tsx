import type { Metadata } from "next";
import { AdminFeatured } from "@/components/admin/admin-featured";

export const metadata: Metadata = {
  title: "Admin Featured",
  description: "Quizora featured content controls.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFeaturedPage() {
  return <AdminFeatured />;
}
