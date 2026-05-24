import type { Metadata } from "next";
import { Suspense } from "react";
import { UpgradePage } from "@/components/billing/billing-pages";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { noindexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: noindexRobots
};

export default function UpgradeRoutePage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <UpgradePage />
    </Suspense>
  );
}
