import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-border bg-surface/80 px-4 text-sm text-foreground shadow-sm transition",
        "placeholder:text-muted-foreground/70 focus:border-primary focus:bg-surface focus:outline-none focus-visible:ring-4 focus-visible:ring-blue/15",
        "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
