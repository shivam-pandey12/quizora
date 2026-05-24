import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { getBillingMode } from "@/lib/billing/config";
import { getFreePlan, getPlan, planPriority } from "@/lib/billing/plans";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { toIso } from "@/lib/firestore/timestamps";
import type {
  BillingAuditLog,
  BillingMode,
  BillingOrder,
  BillingOrderStatus,
  BillingPlanId,
  Entitlement,
  EntitlementStatus,
  PaymentRecord,
  PaymentStatus,
  RefundRecord,
  RefundStatus
} from "@/types/domain";

const userBillingLimit = 60;
const adminBillingLimit = 160;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumberRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}

function mapEntitlement(snapshot: QueryDocumentSnapshot): Entitlement {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: asString(data.userId),
    planId: asString(data.planId, "free") as BillingPlanId,
    planName: asString(data.planName, "Free"),
    status: asString(data.status, "pending") as EntitlementStatus,
    source: asString(data.source, "admin") as Entitlement["source"],
    startsAt: toIso(data.startsAt),
    expiresAt: toIso(data.expiresAt),
    features: asStringList(data.features),
    limits: asNumberRecord(data.limits),
    paymentId: asString(data.paymentId) || null,
    orderId: asString(data.orderId) || null,
    mode: asString(data.mode, "test") as BillingMode,
    adminNote: asString(data.adminNote),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    revokedAt: toIso(data.revokedAt),
    revokedBy: asString(data.revokedBy) || null,
    revokeReason: asString(data.revokeReason) || null
  };
}

function mapPayment(snapshot: QueryDocumentSnapshot): PaymentRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: asString(data.userId),
    userEmail: asString(data.userEmail),
    planId: asString(data.planId, "free") as BillingPlanId,
    planName: asString(data.planName),
    orderId: asString(data.orderId),
    razorpayOrderId: asString(data.razorpayOrderId),
    razorpayPaymentId: asString(data.razorpayPaymentId),
    amount: asNumber(data.amount),
    currency: asString(data.currency, "INR"),
    status: asString(data.status, "unknown") as PaymentStatus,
    method: asString(data.method),
    email: asString(data.email),
    contact: asString(data.contact),
    verified: asBoolean(data.verified),
    webhookConfirmed: asBoolean(data.webhookConfirmed),
    mode: asString(data.mode, "test") as BillingMode,
    supportNote: asString(data.supportNote),
    rawSafeSummary:
      data.rawSafeSummary && typeof data.rawSafeSummary === "object"
        ? (data.rawSafeSummary as Record<string, string | number | boolean | null>)
        : {},
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapOrder(snapshot: QueryDocumentSnapshot): BillingOrder {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: asString(data.userId),
    userEmail: asString(data.userEmail),
    planId: asString(data.planId, "free") as BillingPlanId,
    planName: asString(data.planName),
    amount: asNumber(data.amount),
    currency: asString(data.currency, "INR"),
    razorpayOrderId: asString(data.razorpayOrderId),
    status: asString(data.status, "created") as BillingOrderStatus,
    receipt: asString(data.receipt),
    mode: asString(data.mode, "test") as BillingMode,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapRefund(snapshot: QueryDocumentSnapshot): RefundRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    paymentId: asString(data.paymentId),
    userId: asString(data.userId),
    userEmail: asString(data.userEmail),
    amount: asNumber(data.amount),
    currency: asString(data.currency, "INR"),
    status: asString(data.status, "requested") as RefundStatus,
    reason: asString(data.reason),
    adminNote: asString(data.adminNote),
    mode: asString(data.mode, "test") as BillingMode,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    processedAt: toIso(data.processedAt)
  };
}

function mapBillingAuditLog(snapshot: QueryDocumentSnapshot): BillingAuditLog {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: asString(data.userId),
    adminId: asString(data.adminId),
    action: asString(data.action),
    targetType: asString(data.targetType),
    targetId: asString(data.targetId),
    details: asString(data.details),
    mode: asString(data.mode, "test") as BillingMode,
    createdAt: toIso(data.createdAt)
  };
}

export function getEffectiveEntitlement(entitlements: Entitlement[]) {
  const now = Date.now();
  return entitlements
    .filter((entitlement) => {
      if (entitlement.status !== "active") return false;
      if (!entitlement.expiresAt) return true;
      return new Date(entitlement.expiresAt).getTime() > now;
    })
    .sort((first, second) => {
      const firstPriority = planPriority[first.planId] ?? 0;
      const secondPriority = planPriority[second.planId] ?? 0;
      return secondPriority - firstPriority;
    })[0] ?? null;
}

export function getEffectivePlan(entitlements: Entitlement[]) {
  const entitlement = getEffectiveEntitlement(entitlements);
  return getPlan(entitlement?.planId) ?? getFreePlan();
}

export async function listUserEntitlements(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "entitlements"),
      where("userId", "==", userId),
      where("status", "==", "active"),
      orderBy("expiresAt", "desc"),
      limit(userBillingLimit)
    )
  );
  return snapshot.docs.map(mapEntitlement);
}

export async function listUserPayments(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(userBillingLimit)
    )
  );
  return snapshot.docs.map(mapPayment);
}

export async function listUserOrders(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "billingOrders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(userBillingLimit)
    )
  );
  return snapshot.docs.map(mapOrder);
}

export async function listAdminPayments(count = adminBillingLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "payments"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapPayment);
}

export async function listAdminEntitlements(count = adminBillingLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "entitlements"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapEntitlement);
}

export async function listAdminOrders(count = adminBillingLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "billingOrders"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapOrder);
}

export async function listAdminRefunds(count = adminBillingLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "refunds"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapRefund);
}

export async function listBillingAuditLogs(count = adminBillingLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "billingAuditLogs"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapBillingAuditLog);
}

export async function grantManualEntitlement({
  userId,
  planId,
  durationDays,
  adminId,
  note,
  source = "admin"
}: {
  userId: string;
  planId: BillingPlanId;
  durationDays: number;
  adminId: string;
  note: string;
  source?: Entitlement["source"];
}) {
  const plan = getPlan(planId);
  if (!plan || plan.id === "free") throw new Error("Choose a paid plan.");
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, durationDays));
  const entitlementId = `${userId}_${plan.id}`;
  const mode = getBillingMode();

  await setDoc(
    doc(ensureDb(), "entitlements", entitlementId),
    {
      userId,
      planId: plan.id,
      planName: plan.name,
      status: "active",
      source,
      startsAt: now,
      expiresAt,
      features: plan.features,
      limits: plan.limits,
      paymentId: null,
      orderId: null,
      mode,
      adminNote: note,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revokedAt: null,
      revokedBy: null,
      revokeReason: null
    },
    { merge: true }
  );
  await writeBillingAudit({
    userId,
    adminId,
    action: "entitlement_granted",
    targetType: "entitlement",
    targetId: entitlementId,
    details: `${plan.name}: ${durationDays} days. ${note}`,
    mode
  });
}

export async function revokeManualEntitlement({
  entitlement,
  adminId,
  reason
}: {
  entitlement: Entitlement;
  adminId: string;
  reason: string;
}) {
  await updateDoc(doc(ensureDb(), "entitlements", entitlement.id), {
    status: "revoked",
    revokedAt: serverTimestamp(),
    revokedBy: adminId,
    revokeReason: reason,
    updatedAt: serverTimestamp()
  });
  await writeBillingAudit({
    userId: entitlement.userId,
    adminId,
    action: "entitlement_revoked",
    targetType: "entitlement",
    targetId: entitlement.id,
    details: reason,
    mode: entitlement.mode
  });
}

export async function writeBillingAudit(input: Omit<BillingAuditLog, "id" | "createdAt">) {
  await addDoc(collection(ensureDb(), "billingAuditLogs"), {
    ...input,
    createdAt: serverTimestamp()
  });
}

export async function createRefundRequest({
  payment,
  adminId,
  reason
}: {
  payment: PaymentRecord;
  adminId: string;
  reason: string;
}) {
  const refundRef = await addDoc(collection(ensureDb(), "refunds"), {
    paymentId: payment.razorpayPaymentId,
    userId: payment.userId,
    userEmail: payment.userEmail,
    amount: payment.amount,
    currency: payment.currency,
    status: "requested",
    reason,
    adminNote: "",
    mode: payment.mode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    processedAt: null
  });
  await writeBillingAudit({
    userId: payment.userId,
    adminId,
    action: "refund_requested",
    targetType: "refund",
    targetId: refundRef.id,
    details: reason,
    mode: payment.mode
  });
}

export async function createManualRefundRecord({
  paymentId,
  userId,
  userEmail,
  amount,
  currency,
  adminId,
  reason,
  mode = getBillingMode()
}: {
  paymentId: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  adminId: string;
  reason: string;
  mode?: BillingMode;
}) {
  const refundRef = await addDoc(collection(ensureDb(), "refunds"), {
    paymentId,
    userId,
    userEmail,
    amount,
    currency,
    status: "requested",
    reason,
    adminNote: "",
    mode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    processedAt: null
  });
  await writeBillingAudit({
    userId,
    adminId,
    action: "manual_refund_recorded",
    targetType: "refund",
    targetId: refundRef.id,
    details: reason,
    mode
  });
}

export async function updateRefundStatus({
  refund,
  status,
  adminNote,
  adminId
}: {
  refund: RefundRecord;
  status: RefundStatus;
  adminNote: string;
  adminId: string;
}) {
  await updateDoc(doc(ensureDb(), "refunds", refund.id), {
    status,
    adminNote,
    updatedAt: serverTimestamp(),
    processedAt: status === "processed" ? serverTimestamp() : null
  });
  await writeBillingAudit({
    userId: refund.userId,
    adminId,
    action: "refund_status_updated",
    targetType: "refund",
    targetId: refund.id,
    details: `${status}: ${adminNote}`,
    mode: refund.mode
  });
}
