import { Suspense } from "react";
import { BillingSuccessPage } from "@/components/billing/billing-pages";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function BillingSuccessRoutePage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <BillingSuccessPage />
    </Suspense>
  );
}
