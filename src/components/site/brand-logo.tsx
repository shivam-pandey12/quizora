import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
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

