import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface AdminPlaceholderProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
}

export function AdminPlaceholder({
  icon: Icon,
  eyebrow,
  title,
  description,
  items
}: AdminPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">{title}</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card className="p-5" key={item}>
            <Icon className="size-6 text-primary" />
            <p className="mt-4 font-semibold">{item}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reserved for a controlled admin workflow. Existing production data is left untouched.
            </p>
          </Card>
        ))}
      </div>
      <EmptyState
        icon={Icon}
        title="No records to manage here yet"
        description="This route stays visible so admins understand the product map without exposing unfinished controls."
      />
    </div>
  );
}
