import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function QuizzesLoading() {
  return (
    <div className="container-page py-12">
      <LoadingSkeleton variant="page" />
    </div>
  );
}
