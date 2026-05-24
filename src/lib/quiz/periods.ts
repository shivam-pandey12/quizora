import type { PeriodType } from "@/types/domain";

function isoWeek(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((next.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${next.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getPeriodKey(periodType: PeriodType, date = new Date()) {
  if (periodType === "all-time") return "all";
  if (periodType === "daily") return date.toISOString().slice(0, 10);
  if (periodType === "weekly") return isoWeek(date);
  return date.toISOString().slice(0, 7);
}

export function periodLabel(periodType: PeriodType) {
  if (periodType === "daily") return "Today";
  if (periodType === "weekly") return "This week";
  if (periodType === "monthly") return "This month";
  return "All-time";
}
