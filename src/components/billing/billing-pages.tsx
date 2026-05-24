"use client";

import { AlertTriangle, CheckCircle2, Clock, CreditCard, Crown, RefreshCw, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { PlanBadge, UsageMeter } from "@/components/billing/billing-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { billingFeatureLabels, billingLimitLabels, formatINR } from "@/lib/billing/plans";
import { listUserOrders, listUserPayments } from "@/lib/firestore/billing";
import { formatDate } from "@/lib/firestore/timestamps";
import type { BillingOrder, PaymentRecord } from "@/types/domain";

function formatSubunitAmount(amount: number) {
  return formatINR(Math.round(amount / 100));
}

export function BillingPage({ historyOnly = false }: { historyOnly?: boolean }) {
  const { user } = useAuth();
  const { plan, entitlement, entitlements, loading, error, refreshEntitlements, getLimit } = useEntitlement();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  async function refreshBilling() {
    if (!user) return;
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const [nextPayments, nextOrders] = await Promise.all([
        listUserPayments(user.uid),
        listUserOrders(user.uid),
        refreshEntitlements()
      ]);
      setPayments(nextPayments);
      setOrders(nextOrders);
    } catch (caught) {
      setRecordsError(caught instanceof Error ? caught.message : "Could not load billing records.");
    } finally {
      setRecordsLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setRecordsLoading(false);
      return;
    }
    void refreshBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AuthGate>
      <section className="container-page py-12 sm:py-16">
        <PageHeader
          eyebrow="Billing"
          title={historyOnly ? "Billing history" : "Your Quizora plan"}
          description="Review your active pass, entitlement state, payment history, and support-safe billing records."
        />

        {loading || recordsLoading ? <LoadingSkeleton variant="page" /> : null}
        {error || recordsError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Billing records unavailable"
            description={error || recordsError || "Try again."}
          />
        ) : null}

        {!loading && !recordsLoading && !error && !recordsError ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            {!historyOnly ? (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <PlanBadge plan={plan} />
                      <h2 className="mt-4 text-3xl font-semibold">{plan.name} access</h2>
                      <p className="mt-2 max-w-2xl text-muted-foreground">{plan.description}</p>
                    </div>
                    <Button href="/pricing" icon={<Crown className="size-4" />}>
                      Upgrade
                    </Button>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <UsageMeter label={billingLimitLabels.maxCreatedRooms} current={0} limit={getLimit("maxCreatedRooms")} />
                    <UsageMeter label={billingLimitLabels.maxClasses} current={0} limit={getLimit("maxClasses")} />
                    <UsageMeter label={billingLimitLabels.maxExportsPerMonth} current={0} limit={getLimit("maxExportsPerMonth")} />
                  </div>
                </Card>
                <Card className="p-6">
                  <SectionHeader title="Features unlocked" />
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {plan.features.map((feature) => (
                      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/70 p-3 text-sm font-semibold" key={feature}>
                        <CheckCircle2 className="size-4 text-primary" />
                        {billingFeatureLabels[feature] ?? feature}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : null}

            <div className="space-y-6">
              <Card className="p-5">
                <SectionHeader title="Entitlement status" />
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <Badge>{entitlement?.status ?? "free"}</Badge>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-semibold">{formatDate(entitlement?.expiresAt ?? null)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-semibold">{entitlement?.source ?? "free"}</span>
                  </p>
                </div>
                <Button
                  className="mt-5"
                  fullWidth
                  icon={<RefreshCw className="size-4" />}
                  onClick={() => void refreshBilling().then(() => showToast({ tone: "success", title: "Billing refreshed" }))}
                  variant="secondary"
                >
                  Refresh billing status
                </Button>
              </Card>
              <Card className="p-5">
                <SectionHeader title="All entitlements" />
                <div className="mt-4 grid gap-3">
                  {entitlements.length ? entitlements.map((item) => (
                    <div className="rounded-2xl border border-border bg-surface/70 p-3 text-sm" key={item.id}>
                      <div className="flex items-center justify-between gap-2">
                        <strong>{item.planName}</strong>
                        <Badge>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">Expires {formatDate(item.expiresAt)}</p>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">Free access is active by default.</p>}
                </div>
              </Card>
            </div>

            <Card className="p-6 lg:col-span-2">
              <SectionHeader
                title="Payment history"
                description="Only safe payment summaries are stored. Full card or sensitive bank details are never shown here."
              />
              <div className="mt-5 grid gap-3">
                {payments.length ? payments.map((payment) => (
                  <div className="rounded-3xl border border-border bg-surface/70 p-4" key={payment.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{payment.status}</Badge>
                          <Badge>{payment.webhookConfirmed ? "Webhook confirmed" : "Awaiting webhook"}</Badge>
                          <Badge>{payment.mode}</Badge>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold">{payment.planName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {payment.razorpayPaymentId.slice(0, 12)}... • {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <p className="text-xl font-semibold">{formatSubunitAmount(payment.amount)}</p>
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    icon={CreditCard}
                    title="No payments yet"
                    description="Your Razorpay payments will appear here after checkout."
                  />
                )}
              </div>
            </Card>

            {orders.length ? (
              <Card className="p-6 lg:col-span-2">
                <SectionHeader title="Recent orders" />
                <div className="mt-4 grid gap-2">
                  {orders.slice(0, 5).map((order) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/70 p-3 text-sm" key={order.id}>
                      <span>{order.planName}</span>
                      <span className="text-muted-foreground">{order.razorpayOrderId}</span>
                      <Badge>{order.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </section>
    </AuthGate>
  );
}

export function BillingSuccessPage() {
  const params = useSearchParams();
  const plan = params.get("plan") || "selected plan";
  return (
    <AuthGate>
      <section className="container-page py-16">
        <EmptyState
          icon={CheckCircle2}
          title="Payment verified"
          description={`Your ${plan} access is active after server verification. Razorpay webhook confirmation may still be reconciling in the background.`}
          actionHref="/billing"
          actionLabel="Open billing"
        />
      </section>
    </AuthGate>
  );
}

export function BillingFailedPage() {
  return (
    <AuthGate>
      <section className="container-page py-16">
        <EmptyState
          icon={XCircle}
          title="Payment was not completed"
          description="No premium access was granted from this checkout. You can retry from pricing or contact support with any Razorpay payment ID shown to you."
          actionHref="/pricing"
          actionLabel="Retry checkout"
        />
      </section>
    </AuthGate>
  );
}

export function UpgradePage() {
  const params = useSearchParams();
  const requestedPlan = params.get("plan");
  return (
    <AuthGate>
      <section className="container-page py-16">
        <EmptyState
          icon={Clock}
          title="Choose your upgrade"
          description="Pick a Quizora pass on the pricing page. Checkout will calculate the price server-side before opening Razorpay."
          actionHref={requestedPlan ? `/pricing?plan=${requestedPlan}` : "/pricing"}
          actionLabel="Continue to pricing"
        />
      </section>
    </AuthGate>
  );
}
