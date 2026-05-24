import type { Metadata } from "next";
import { AdminRefundsPage } from "@/components/admin/admin-billing";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin Refunds",
  robots: noindexRobots
};

export default function AdminRefundsRoutePage() {
  return <AdminRefundsPage />;
}
