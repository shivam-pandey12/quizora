import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionHref,
  actionLabel,
  className
}: EmptyStateProps) {
  return (
    <Card className={`p-8 text-center ${className ?? ""}`}>
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Icon className="size-7" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button className="mt-6" href={actionHref}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
