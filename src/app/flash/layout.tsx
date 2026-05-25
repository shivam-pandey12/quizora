import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Flash Quizzes",
  description: "Temporary noindex Quizora Flash Quizzes for code-based play.",
  robots: noindexRobots
};

export default function FlashLayout({ children }: { children: React.ReactNode }) {
  return children;
}
