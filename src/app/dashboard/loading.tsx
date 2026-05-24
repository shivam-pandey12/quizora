import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="container-page py-10">
      <LoadingSkeleton variant="page" />
    </div>
  );
}
