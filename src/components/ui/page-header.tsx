import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  children
}: PageHeaderProps) {
  return (
    <section className={cn("relative overflow-hidden py-10 sm:py-14", className)}>
      <div className="absolute inset-0 premium-grid opacity-60" />
      <div className="container-page relative">
        {eyebrow ? <Badge className="mb-4 text-primary">{eyebrow}</Badge> : null}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
