import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Classes",
  robots: noindexRobots
};

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
