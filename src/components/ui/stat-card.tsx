import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, helper, icon, className }: StatCardProps) {
  return (
    <Card className={cn("group p-5 hover:-translate-y-1 hover:shadow-glow motion-reduce:hover:translate-y-0", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-3xl font-semibold">{value}</p>
        </div>
        {icon ? (
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary transition group-hover:scale-105">
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{helper}</p>
    </Card>
  );
}
