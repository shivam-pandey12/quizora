import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Creator Studio",
  robots: noindexRobots
};

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
