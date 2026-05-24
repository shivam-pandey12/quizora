import { Suspense } from "react";
import { AssignmentResultPage } from "@/components/classroom/student-pages";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default async function AssignmentResultRoute({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return (
    <Suspense fallback={<div className="container-page py-12"><LoadingSkeleton variant="page" /></div>}>
      <AssignmentResultPage assignmentId={assignmentId} />
    </Suspense>
  );
}
