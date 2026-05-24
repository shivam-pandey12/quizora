import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  active: "border-success/20 bg-success/10 text-success",
  hidden: "border-muted bg-muted text-muted-foreground",
  draft: "border-warning/20 bg-warning/10 text-warning",
  published: "border-success/20 bg-success/10 text-success",
  archived: "border-muted bg-muted text-muted-foreground",
  public: "border-blue/20 bg-blue/10 text-blue",
  private: "border-muted bg-muted text-muted-foreground",
  featured: "border-primary/20 bg-primary/10 text-primary",
  daily: "border-blue/20 bg-blue/10 text-blue",
  correct: "border-success/20 bg-success/10 text-success",
  incorrect: "border-danger/20 bg-danger/10 text-danger",
  skipped: "border-warning/20 bg-warning/10 text-warning"
};

export function StatusBadge({
  value,
  children,
  className
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge className={cn(tones[value] ?? "bg-surface text-muted-foreground", className)}>
      {children ?? value}
    </Badge>
  );
}
