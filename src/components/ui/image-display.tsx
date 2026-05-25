"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ImageDisplay({
  src,
  alt,
  caption,
  className,
  imageClassName,
  compact = false
}: {
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  className?: string;
  imageClassName?: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-3xl border border-dashed border-border bg-muted/50 text-muted-foreground",
          compact ? "min-h-28" : "min-h-48",
          className
        )}
      >
        <div className="grid justify-items-center gap-2 text-center text-sm">
          <ImageOff className="size-5" />
          <span>Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <figure className={cn("overflow-hidden rounded-3xl border border-border bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt || "Quizora quiz image"}
        className={cn("h-full max-h-[28rem] w-full object-contain", imageClassName)}
        loading="lazy"
        onError={() => setFailed(true)}
        src={src}
      />
      {caption ? (
        <figcaption className="border-t border-border bg-surface/80 px-4 py-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
