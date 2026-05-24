import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("container-page pt-6 text-sm", className)}
    >
      <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <li>
          <Link
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition hover:bg-primary/10 hover:text-foreground"
            href="/"
          >
            <Home className="size-3.5" />
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li className="flex items-center gap-2" key={`${item.href ?? item.label}-${item.label}`}>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            {item.href ? (
              <Link
                className="rounded-full px-2 py-1 font-semibold transition hover:bg-primary/10 hover:text-foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-full px-2 py-1 font-semibold text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
