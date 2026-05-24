import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-8 max-w-3xl", className)}>
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold uppercase text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="text-balance text-3xl font-semibold sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
