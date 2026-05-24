import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:bg-primary/92",
  secondary:
    "border border-border bg-surface/70 text-foreground hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10",
  ghost: "text-foreground hover:bg-foreground/7 dark:hover:bg-white/10",
  danger: "bg-danger text-white hover:-translate-y-0.5 hover:bg-danger/90"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full font-semibold transition duration-200",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-blue/35",
    "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className
  );

  if (href) {
    return (
      <Link
        aria-disabled={disabled || undefined}
        className={classes}
        href={href}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {icon}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
