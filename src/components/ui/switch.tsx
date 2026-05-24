"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled
}: SwitchProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-surface/65 p-4 transition hover:border-primary/35 hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        type="checkbox"
      />
      <span
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-muted transition peer-checked:bg-primary peer-disabled:opacity-50",
          "peer-focus-visible:ring-4 peer-focus-visible:ring-blue/15",
          "after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5"
        )}
      />
    </label>
  );
}
