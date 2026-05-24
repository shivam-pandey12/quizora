import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Assignments",
  robots: noindexRobots
};

export default function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
