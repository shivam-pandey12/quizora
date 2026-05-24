import type { Metadata } from "next";
import { AdminPaymentsPage } from "@/components/admin/admin-billing";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin Payments",
  robots: noindexRobots
};

export default function AdminPaymentsRoutePage() {
  return <AdminPaymentsPage />;
}
