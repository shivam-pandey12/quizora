import type { Metadata } from "next";
import { AdminImportExport } from "@/components/admin/admin-import-export";

export const metadata: Metadata = {
  title: "Admin Import Export",
  description: "Quizora import and export tools.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminImportExportPage() {
  return <AdminImportExport />;
}
