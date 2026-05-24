import type { Metadata } from "next";
import { AdminBillingDashboard } from "@/components/admin/admin-billing";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin Billing",
  robots: noindexRobots
};

export default function AdminBillingPage() {
  return <AdminBillingDashboard />;
}
