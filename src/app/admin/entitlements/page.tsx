import type { Metadata } from "next";
import { AdminEntitlementsPage } from "@/components/admin/admin-billing";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin Entitlements",
  robots: noindexRobots
};

export default function AdminEntitlementsRoutePage() {
  return <AdminEntitlementsPage />;
}
