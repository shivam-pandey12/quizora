import type { Metadata } from "next";
import { AdminAuditLog } from "@/components/admin/admin-audit-log";

export const metadata: Metadata = {
  title: "Admin Audit Log",
  description: "Quizora admin audit log.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminAuditLogPage() {
  return <AdminAuditLog />;
}
