import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export function AdminDataState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  icon
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  icon?: LucideIcon;
}) {
  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Firestore records
        </div>
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Firestore request failed"
        description={error}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        icon={icon ?? Database}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return null;
}
