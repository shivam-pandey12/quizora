import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { JoinClassPage } from "@/components/classroom/student-pages";

export default function JoinClassRoute() {
  return (
    <Suspense fallback={<div className="container-page py-12"><LoadingSkeleton variant="page" /></div>}>
      <JoinClassPage />
    </Suspense>
  );
}
