import { getFreePlan, getPlanLimit, hasPlanFeature } from "@/lib/billing/plans";
import type { BillingPlan, FlashLimits, UserProfile } from "@/types/domain";

export const freeFlashLimits: FlashLimits = {
  maxExpiryHours: 7,
  maxQuestions: 10,
  maxPlayers: 10,
  maxActiveFlashQuizzes: 2,
  canExportResults: false,
  canExtendExpiry: false,
  canConvertToDraft: false,
  hasAdvancedHostDashboard: false
};

export function getFlashQuizLimits(plan?: BillingPlan | null, profile?: UserProfile | null): FlashLimits {
  const resolvedPlan = profile?.role === "admin" ? null : plan ?? getFreePlan();
  if (!resolvedPlan || profile?.role === "admin") {
    return {
      maxExpiryHours: 720,
      maxQuestions: 250,
      maxPlayers: 500,
      maxActiveFlashQuizzes: 1000,
      canExportResults: true,
      canExtendExpiry: true,
      canConvertToDraft: true,
      hasAdvancedHostDashboard: true
    };
  }

  return {
    maxExpiryHours: getPlanLimit(resolvedPlan, "flashMaxExpiryHours") || freeFlashLimits.maxExpiryHours,
    maxQuestions: getPlanLimit(resolvedPlan, "flashMaxQuestions") || freeFlashLimits.maxQuestions,
    maxPlayers: getPlanLimit(resolvedPlan, "flashMaxPlayers") || freeFlashLimits.maxPlayers,
    maxActiveFlashQuizzes: getPlanLimit(resolvedPlan, "flashMaxActive") || freeFlashLimits.maxActiveFlashQuizzes,
    canExportResults: hasPlanFeature(resolvedPlan, "flash.exportResults"),
    canExtendExpiry: hasPlanFeature(resolvedPlan, "flash.extendExpiry"),
    canConvertToDraft: hasPlanFeature(resolvedPlan, "flash.convertToDraft") || profile?.creatorStatus === "approved",
    hasAdvancedHostDashboard: hasPlanFeature(resolvedPlan, "flash.advancedHost")
  };
}

export function clampFlashExpiry(hours: number, limits: FlashLimits) {
  return Math.max(1, Math.min(limits.maxExpiryHours, Math.round(hours)));
}

export function flashLimitSummary(limits: FlashLimits) {
  return [
    `${limits.maxExpiryHours}h expiry`,
    `${limits.maxQuestions} questions`,
    `${limits.maxPlayers} players`,
    `${limits.maxActiveFlashQuizzes} active`
  ];
}
