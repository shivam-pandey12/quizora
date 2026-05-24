"use client";

import { Banknote, Crown, CreditCard, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { PlanBadge } from "@/components/billing/billing-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { getBillingMode } from "@/lib/billing/config";
import { formatINR, getPlan, getActivePlans } from "@/lib/billing/plans";
import {
  createManualRefundRecord,
  grantManualEntitlement,
  listAdminEntitlements,
  listAdminOrders,
  listAdminPayments,
  listAdminRefunds,
  listBillingAuditLogs,
  revokeManualEntitlement,
  updateRefundStatus
} from "@/lib/firestore/billing";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDate } from "@/lib/firestore/timestamps";
import type { BillingAuditLog, BillingPlanId, Entitlement, PaymentRecord, RefundRecord, RefundStatus } from "@/types/domain";

function formatSubunitAmount(amount: number) {
  return formatINR(Math.round(amount / 100));
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-balance text-4xl font-semibold">{title}</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminBillingDashboard() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [logs, setLogs] = useState<BillingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextPayments, nextEntitlements, nextRefunds, nextLogs] = await Promise.all([
        listAdminPayments(80),
        listAdminEntitlements(80),
        listAdminRefunds(80),
        listBillingAuditLogs(40)
      ]);
      setPayments(nextPayments);
      setEntitlements(nextEntitlements);
      setRefunds(nextRefunds);
      setLogs(nextLogs);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load billing dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const capturedPayments = payments.filter((payment) => payment.status === "captured" || payment.status === "authorized");
  const revenue = capturedPayments.reduce((total, payment) => total + payment.amount, 0);
  const activeEntitlements = entitlements.filter((item) => item.status === "active").length;
  const failedPayments = payments.filter((payment) => payment.status === "failed").length;
  const pendingRefunds = refunds.filter((refund) => refund.status === "requested" || refund.status === "reviewing").length;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Billing"
        title="Billing command center"
        description="A bounded billing overview for payments, entitlements, refunds, and manual admin actions."
      />
      <AdminDataState empty={false} emptyDescription="" emptyTitle="" error={error} loading={loading} />
      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={<Banknote className="size-5" />} label="Recent revenue" value={formatSubunitAmount(revenue)} helper="Loaded payment sample" />
            <StatCard icon={<Crown className="size-5" />} label="Active entitlements" value={String(activeEntitlements)} helper="Paid/admin/promo access" />
            <StatCard icon={<CreditCard className="size-5" />} label="Payments loaded" value={String(payments.length)} helper={`${failedPayments} failed`} />
            <StatCard icon={<RotateCcw className="size-5" />} label="Refund queue" value={String(pendingRefunds)} helper="Manual tracking only" />
            <StatCard icon={<ShieldCheck className="size-5" />} label="Mode" value={getBillingMode()} helper="Test/live indicator" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionHeader title="Recent payments" />
              <div className="mt-4 grid gap-3">
                {payments.slice(0, 6).map((payment) => (
                  <div className="rounded-2xl border border-border bg-surface/70 p-3" key={payment.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Badge>{payment.status}</Badge>
                        <p className="mt-2 font-semibold">{payment.planName}</p>
                        <p className="text-sm text-muted-foreground">{payment.userEmail || payment.userId}</p>
                      </div>
                      <p className="font-semibold">{formatSubunitAmount(payment.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Billing audit trail" />
              <div className="mt-4 grid gap-3">
                {logs.slice(0, 8).map((log) => (
                  <div className="rounded-2xl border border-border bg-surface/70 p-3 text-sm" key={log.id}>
                    <p className="font-semibold">{log.action}</p>
                    <p className="text-muted-foreground">{log.details}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [queryText, setQueryText] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [nextPayments, orders] = await Promise.all([listAdminPayments(), listAdminOrders()]);
      setPayments(nextPayments);
      setOrdersCount(orders.length);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = status === "all" || payment.status === status;
      const matchesQuery =
        !normalized ||
        [payment.userEmail, payment.userId, payment.razorpayPaymentId, payment.razorpayOrderId, payment.planName]
          .some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [payments, queryText, status]);

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Payments" title="Payment records" description="Inspect safe Razorpay payment summaries without exposing sensitive payment details." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Payments" value={String(payments.length)} helper="Recent bounded sample" />
        <StatCard label="Orders" value={String(ordersCount)} helper="Recent created orders" />
        <StatCard label="Captured/authorized" value={String(payments.filter((item) => item.status === "captured" || item.status === "authorized").length)} helper="Verified payment paths" />
      </div>
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search email, user, payment, order, plan" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="authorized">Authorized</option>
            <option value="captured">Captured</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="unknown">Unknown</option>
          </Select>
          <Button icon={<RefreshCw className="size-4" />} onClick={() => void load()} variant="secondary">Refresh</Button>
        </div>
      </Card>
      <AdminDataState empty={!filtered.length} emptyDescription="Payments appear after Razorpay checkout or webhook processing." emptyTitle="No payments found" error={error} loading={loading} />
      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((payment) => (
            <Card className="p-4" key={payment.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{payment.status}</Badge>
                    <Badge>{payment.mode}</Badge>
                    <Badge>{payment.webhookConfirmed ? "webhook confirmed" : "awaiting webhook"}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{payment.planName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{payment.userEmail || payment.userId}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Payment {payment.razorpayPaymentId} • Order {payment.razorpayOrderId}
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-2xl font-semibold">{formatSubunitAmount(payment.amount)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(payment.createdAt)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminEntitlementsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [queryText, setQueryText] = useState("");
  const [grantForm, setGrantForm] = useState({
    userId: "",
    planId: "plus" as BillingPlanId,
    durationDays: 30,
    note: ""
  });
  const [revokeTarget, setRevokeTarget] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setEntitlements(await listAdminEntitlements());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load entitlements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setWorking(true);
    try {
      await grantManualEntitlement({
        userId: grantForm.userId.trim(),
        planId: grantForm.planId,
        durationDays: grantForm.durationDays,
        note: grantForm.note,
        adminId: user.uid
      });
      showToast({ tone: "success", title: "Entitlement granted" });
      setGrantForm((current) => ({ ...current, userId: "", note: "" }));
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Grant failed", description: caught instanceof Error ? caught.message : "Try again." });
    } finally {
      setWorking(false);
    }
  }

  async function revoke() {
    if (!revokeTarget || !user) return;
    setWorking(true);
    try {
      await revokeManualEntitlement({
        entitlement: revokeTarget,
        adminId: user.uid,
        reason: "Revoked from admin entitlements page."
      });
      showToast({ tone: "success", title: "Entitlement revoked" });
      setRevokeTarget(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Revoke failed", description: caught instanceof Error ? caught.message : "Try again." });
    } finally {
      setWorking(false);
    }
  }

  const filtered = entitlements.filter((entitlement) => {
    const normalized = queryText.trim().toLowerCase();
    return !normalized || [entitlement.userId, entitlement.planName, entitlement.source, entitlement.status].some((value) => value.toLowerCase().includes(normalized));
  });

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Entitlements" title="Manual access control" description="Grant, inspect, and revoke paid access without changing user roles." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <Card className="p-4">
            <Input placeholder="Search user, plan, source, status" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
          </Card>
          <AdminDataState empty={!filtered.length} emptyDescription="Entitlements appear after payment verification or manual grants." emptyTitle="No entitlements found" error={error} loading={loading} />
          {!loading && !error ? filtered.map((entitlement) => {
            const plan = getPlan(entitlement.planId);
            return (
              <Card className="p-4" key={entitlement.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <PlanBadge plan={plan} />
                    <h2 className="mt-3 text-xl font-semibold">{entitlement.userId}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entitlement.source} • expires {formatDate(entitlement.expiresAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{entitlement.status}</Badge>
                    {entitlement.status === "active" ? (
                      <Button size="sm" variant="danger" onClick={() => setRevokeTarget(entitlement)}>Revoke</Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          }) : null}
        </div>
        <Card className="h-fit p-5">
          <SectionHeader title="Grant entitlement" description="Use this for support, promos, testing, or manual business decisions." />
          <form className="mt-5 grid gap-4" onSubmit={(event) => void grant(event)}>
            <label className="grid gap-2 text-sm font-semibold">
              User ID
              <Input required value={grantForm.userId} onChange={(event) => setGrantForm((current) => ({ ...current, userId: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Plan
              <Select value={grantForm.planId} onChange={(event) => setGrantForm((current) => ({ ...current, planId: event.target.value as BillingPlanId }))}>
                {getActivePlans().filter((plan) => plan.id !== "free").map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Duration days
              <Input type="number" min={1} max={730} value={grantForm.durationDays} onChange={(event) => setGrantForm((current) => ({ ...current, durationDays: Number(event.target.value) }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Reason
              <Textarea required value={grantForm.note} onChange={(event) => setGrantForm((current) => ({ ...current, note: event.target.value }))} />
            </label>
            <Button disabled={working || !grantForm.userId.trim() || !grantForm.note.trim()} type="submit">Grant access</Button>
          </form>
        </Card>
      </div>
      <ConfirmDialog
        confirmLabel="Revoke access"
        description="This immediately marks the entitlement revoked. The user falls back to another active entitlement or Free."
        loading={working}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => void revoke()}
        open={Boolean(revokeTarget)}
        title="Revoke entitlement?"
      />
    </div>
  );
}

export function AdminRefundsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    paymentId: "",
    userId: "",
    userEmail: "",
    amount: 0,
    currency: "INR",
    reason: ""
  });

  async function load() {
    setLoading(true);
    try {
      setRefunds(await listAdminRefunds());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load refunds.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    await createManualRefundRecord({ ...form, adminId: user.uid });
    showToast({ tone: "success", title: "Refund record created" });
    setForm({ paymentId: "", userId: "", userEmail: "", amount: 0, currency: "INR", reason: "" });
    await load();
  }

  async function updateStatus(refund: RefundRecord, status: RefundStatus) {
    if (!user) return;
    await updateRefundStatus({ refund, status, adminNote: `Marked ${status} by admin.`, adminId: user.uid });
    showToast({ tone: "success", title: "Refund updated" });
    await load();
  }

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Refunds" title="Refund tracking" description="Track refund requests manually. Automatic Razorpay refund API calls are intentionally excluded from Phase 13." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div>
          <AdminDataState empty={!refunds.length} emptyDescription="Create a manual refund record or wait for refund webhooks." emptyTitle="No refunds tracked" error={error} loading={loading} />
          {!loading && !error ? (
            <div className="grid gap-3">
              {refunds.map((refund) => (
                <Card className="p-4" key={refund.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge>{refund.status}</Badge>
                      <h2 className="mt-3 text-xl font-semibold">{formatSubunitAmount(refund.amount)}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{refund.userEmail || refund.userId} • {refund.paymentId}</p>
                      <p className="mt-2 text-sm">{refund.reason}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void updateStatus(refund, "reviewing")}>Reviewing</Button>
                      <Button size="sm" onClick={() => void updateStatus(refund, "processed")}>Processed</Button>
                      <Button size="sm" variant="danger" onClick={() => void updateStatus(refund, "rejected")}>Reject</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
        <Card className="h-fit p-5">
          <SectionHeader title="Record refund request" />
          <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
            <Input required placeholder="Razorpay payment ID" value={form.paymentId} onChange={(event) => setForm((current) => ({ ...current, paymentId: event.target.value }))} />
            <Input required placeholder="User ID" value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} />
            <Input placeholder="User email" value={form.userEmail} onChange={(event) => setForm((current) => ({ ...current, userEmail: event.target.value }))} />
            <Input required type="number" min={1} placeholder="Amount in paise" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
            <Textarea required placeholder="Reason" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            <Button disabled={!form.paymentId || !form.userId || !form.reason} type="submit">Record refund</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
