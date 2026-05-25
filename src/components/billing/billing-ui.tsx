"use client";

import { Crown, LockKeyhole, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { billingLimitLabels, formatINR, hasPlanDiscount } from "@/lib/billing/plans";
import type { BillingPlan } from "@/types/domain";

export function PlanBadge({ plan }: { plan?: BillingPlan | null }) {
  const resolved = plan?.name || "Free";
  return (
    <Badge className={plan?.id === "free" ? "" : "text-primary"}>
      <Crown className="mr-1.5 size-3.5" />
      {resolved}
    </Badge>
  );
}

export function UpgradeCard({
  title = "Unlock more with Quizora Plus",
  description = "Upgrade when you need more rooms, richer analytics, creator tools, or larger classroom workflows.",
  cta = "View pricing"
}: {
  title?: string;
  description?: string;
  cta?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge className="mb-3 text-primary">
            <Sparkles className="mr-1.5 size-3.5" />
            Premium access
          </Badge>
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button href="/pricing" icon={<Crown className="size-4" />}>
          {cta}
        </Button>
      </div>
    </Card>
  );
}

export function FeatureGate({
  feature,
  children,
  fallback
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasFeature } = useEntitlement();
  if (hasFeature(feature)) return children;
  return (
    fallback ?? (
      <UpgradeCard
        title="Premium feature"
        description="This Quizora workflow is available on an upgraded plan."
      />
    )
  );
}

export function LimitGate({
  limitKey,
  current,
  children,
  fallback
}: {
  limitKey: string;
  current: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { getLimit } = useEntitlement();
  const limit = getLimit(limitKey);
  if (!limit || current < limit) return children;
  return (
    fallback ?? (
      <UpgradeCard
        title="Plan limit reached"
        description={`Your current plan includes ${limit} ${billingLimitLabels[limitKey] ?? limitKey}. Upgrade to raise this limit.`}
      />
    )
  );
}

export function UsageMeter({
  label,
  current,
  limit
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return (
    <div className="rounded-3xl border border-border bg-surface/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-sm text-muted-foreground">
          {current}/{limit || "∞"}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PriceLine({ plan }: { plan: BillingPlan }) {
  if (plan.priceINR === 0) {
    return <p className="text-4xl font-semibold">Free</p>;
  }
  const discounted = hasPlanDiscount(plan);
  return (
    <div className="space-y-2">
      {discounted ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground line-through decoration-primary/70 decoration-2">
            {formatINR(plan.originalPriceINR ?? plan.priceINR)}
          </span>
          <Badge className="border-success/30 bg-success/10 text-success">
            <Sparkles className="mr-1.5 size-3.5" />
            {plan.discountLabel ?? `${plan.discountPercent}% OFF`}
          </Badge>
        </div>
      ) : null}
      <p className="text-4xl font-semibold">
        {formatINR(plan.priceINR)}
        <span className="ml-2 text-base font-medium text-muted-foreground">
          / {plan.durationDays} days
        </span>
      </p>
      {discounted ? (
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Payable checkout amount
        </span>
      ) : null}
    </div>
  );
}

export function LockedInline({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
      <LockKeyhole className="size-3" />
      {label}
    </span>
  );
}
