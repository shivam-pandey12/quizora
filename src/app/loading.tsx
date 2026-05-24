import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="container-page py-12">
      <LoadingSkeleton variant="page" />
    </div>
  );
}
