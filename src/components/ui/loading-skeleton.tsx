import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "page" | "line";
  className?: string;
}

export function LoadingSkeleton({ variant = "card", className }: LoadingSkeletonProps) {
  if (variant === "page") {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="shimmer h-14 w-3/4 rounded-3xl" />
        <div className="shimmer h-6 w-1/2 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="shimmer h-52 rounded-3xl" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "line") {
    return <div className={cn("shimmer h-4 rounded-full", className)} />;
  }

  return <div className={cn("shimmer h-48 rounded-3xl", className)} />;
}
