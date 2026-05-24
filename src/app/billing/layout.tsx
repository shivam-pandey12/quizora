import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Billing",
  robots: noindexRobots
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
