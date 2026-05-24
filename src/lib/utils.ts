import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

export function titleCase(value: string) {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSeconds(value?: number) {
  if (!value) return "No limit";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  if (!minutes) return `${seconds}s`;
  if (!seconds) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
