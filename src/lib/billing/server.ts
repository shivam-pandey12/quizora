import "server-only";

import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPlan, planPriority } from "@/lib/billing/plans";
import type {
  BillingMode,
  BillingOrderStatus,
  BillingPlan,
  BillingPlanId,
  BillingSource,
  EntitlementStatus,
  PaymentStatus
} from "@/types/domain";

export function amountToSubunits(amountINR: number) {
  return Math.round(amountINR * 100);
}

export function receiptFor(userId: string, planId: string) {
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "user";
  return `qz_${planId}_${prefix}_${Date.now().toString(36)}`.slice(0, 40);
}

export function verifyRazorpayPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  keySecret
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}) {
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expected.length !== razorpaySignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
}

export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
  webhookSecret
}: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function createBillingOrderRecord({
  userId,
  userEmail,
  plan,
  razorpayOrderId,
  amount,
  currency,
  receipt,
  mode
}: {
  userId: string;
  userEmail: string;
  plan: BillingPlan;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  mode: BillingMode;
}) {
  const db = getAdminDb();
  const ref = db.collection("billingOrders").doc();
  await ref.set({
    userId,
    userEmail,
    planId: plan.id,
    planName: plan.name,
    amount,
    currency,
    razorpayOrderId,
    status: "created",
    receipt,
    mode,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function getBillingOrderByRazorpayOrderId(razorpayOrderId: string) {
  const snapshot = await getAdminDb()
    .collection("billingOrders")
    .where("razorpayOrderId", "==", razorpayOrderId)
    .limit(1)
    .get();
  return snapshot.docs[0] ?? null;
}

export async function updateBillingOrderStatus(orderId: string, status: BillingOrderStatus) {
  await getAdminDb().collection("billingOrders").doc(orderId).set(
    {
      status,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function recordPayment({
  userId,
  userEmail,
  plan,
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  amount,
  currency,
  status,
  verified,
  webhookConfirmed,
  mode,
  rawSafeSummary = {}
}: {
  userId: string;
  userEmail: string;
  plan: BillingPlan;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  verified: boolean;
  webhookConfirmed: boolean;
  mode: BillingMode;
  rawSafeSummary?: Record<string, string | number | boolean | null>;
}) {
  const db = getAdminDb();
  await db.collection("payments").doc(razorpayPaymentId).set(
    {
      userId,
      userEmail,
      planId: plan.id,
      planName: plan.name,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      amount,
      currency,
      status,
      method: rawSafeSummary.method || "",
      email: rawSafeSummary.email || "",
      contact: rawSafeSummary.contact || "",
      verified,
      webhookConfirmed,
      mode,
      supportNote: "",
      rawSafeSummary,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function readTimestamp(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export async function activateEntitlementForPayment({
  userId,
  plan,
  paymentId,
  orderId,
  source,
  mode,
  adminNote = ""
}: {
  userId: string;
  plan: BillingPlan;
  paymentId: string | null;
  orderId: string | null;
  source: BillingSource;
  mode: BillingMode;
  adminNote?: string;
}) {
  if (plan.id === "free") return `${userId}_free`;

  const db = getAdminDb();
  const entitlementId = `${userId}_${plan.id}`;
  const entitlementRef = db.collection("entitlements").doc(entitlementId);
  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(entitlementRef);
    const existingData = existing.exists ? existing.data() : null;
    const existingStatus = existingData?.status as EntitlementStatus | undefined;
    const existingExpiresAt = readTimestamp(existingData?.expiresAt);
    const activeBase =
      existingStatus === "active" && existingExpiresAt && existingExpiresAt.getTime() > now.getTime()
        ? existingExpiresAt
        : now;
    const expiresAt = plan.durationDays > 0 ? addDays(activeBase, plan.durationDays) : null;

    transaction.set(
      entitlementRef,
      {
        userId,
        planId: plan.id,
        planName: plan.name,
        status: "active",
        source,
        startsAt: existingData?.startsAt || Timestamp.fromDate(now),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        features: plan.features,
        limits: plan.limits,
        paymentId,
        orderId,
        mode,
        adminNote,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
        revokedAt: null,
        revokedBy: null,
        revokeReason: null
      },
      { merge: true }
    );
  });

  return entitlementId;
}

export async function writeBillingAuditLog({
  userId,
  adminId,
  action,
  targetType,
  targetId,
  details,
  mode
}: {
  userId: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  mode: BillingMode;
}) {
  await getAdminDb().collection("billingAuditLogs").add({
    userId,
    adminId,
    action,
    targetType,
    targetId,
    details,
    mode,
    createdAt: FieldValue.serverTimestamp()
  });
}

export async function revokeEntitlement({
  entitlementId,
  revokedBy,
  reason
}: {
  entitlementId: string;
  revokedBy: string;
  reason: string;
}) {
  await getAdminDb().collection("entitlements").doc(entitlementId).set(
    {
      status: "revoked",
      revokedAt: FieldValue.serverTimestamp(),
      revokedBy,
      revokeReason: reason,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function getEffectivePlanForUser(userId: string) {
  const snapshot = await getAdminDb()
    .collection("entitlements")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();
  const now = Date.now();
  const active = snapshot.docs
    .map((docSnapshot) => docSnapshot.data())
    .filter((data) => {
      const plan = getPlan(String(data.planId));
      const expiresAt = readTimestamp(data.expiresAt);
      return plan && (!expiresAt || expiresAt.getTime() > now);
    })
    .sort((first, second) => {
      const firstPriority = planPriority[first.planId as BillingPlanId] ?? 0;
      const secondPriority = planPriority[second.planId as BillingPlanId] ?? 0;
      return secondPriority - firstPriority;
    });
  const winner = active[0];
  return getPlan(String(winner?.planId)) || getPlan("free");
}
