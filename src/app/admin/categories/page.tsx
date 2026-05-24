import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata: Metadata = {
  title: "Admin Categories",
  description: "Quizora category manager.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
