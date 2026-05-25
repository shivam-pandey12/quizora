import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  className,
  variant = "plain"
}: {
  compact?: boolean;
  className?: string;
  variant?: "plain" | "header";
}) {
  if (variant === "header") {
    return (
      <Link
        className={cn(
          "group relative inline-flex h-14 items-center gap-3 rounded-full border border-primary/20 bg-surface/80 px-2.5 pr-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className
        )}
        href="/"
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-primary/25 bg-background p-1.5 shadow-soft">
          <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/40 dark:ring-white/10" />
          <Image
            alt="Quizora"
            className="relative z-10 size-full rounded-[1rem] object-contain drop-shadow-sm transition duration-300 group-hover:scale-105"
            height={44}
            priority
            src="/logo.png"
            width={44}
          />
        </span>
        {compact ? null : (
          <span className="grid min-w-0 leading-none">
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-xl font-black tracking-normal text-transparent">
              Quizora
            </span>
            <span className="mt-1 hidden text-[0.62rem] font-black uppercase tracking-[0.22em] text-primary/75 xl:block">
              Quiz Arena
            </span>
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <Link className={cn("flex items-center gap-3", className)} href="/">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-surface/80 p-1.5 shadow-glow">
        <Image
          alt="Quizora"
          className="size-full object-contain"
          height={40}
          priority
          src="/logo.png"
          width={40}
        />
      </span>
      {compact ? null : <span className="text-lg font-bold tracking-normal">Quizora</span>}
    </Link>
  );
}
