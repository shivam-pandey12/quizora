import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

function safeImageUrl(value?: string | null) {
  if (!value) return "";

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value : "";
  } catch {
    return "";
  }
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const imageUrl = safeImageUrl(src);
  const sizes = {
    sm: "size-7 rounded-full",
    md: "size-10 rounded-full",
    lg: "size-24 rounded-3xl"
  };
  const iconSizes = {
    sm: "size-4",
    md: "size-5",
    lg: "size-11"
  };

  return (
    <span
      aria-label={name ? `${name} profile image` : "Profile image"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-primary/20 bg-primary/12 text-primary shadow-sm",
        sizes[size],
        className
      )}
      role="img"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      ) : (
        <UserRound className={iconSizes[size]} />
      )}
    </span>
  );
}
