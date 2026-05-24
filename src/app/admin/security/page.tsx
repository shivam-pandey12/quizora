import type { Metadata } from "next";
import { AdminSecurity } from "@/components/admin/admin-security";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Security Review",
  robots: noindexRobots
};

export default function AdminSecurityPage() {
  return <AdminSecurity />;
}
