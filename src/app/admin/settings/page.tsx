import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin/admin-settings";

export const metadata: Metadata = {
  title: "Admin Settings",
  description: "Quizora settings.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
