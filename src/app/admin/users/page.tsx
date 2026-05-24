import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Admin Users",
  description: "Quizora user manager.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminUsersPage() {
  return <AdminUsers />;
}
