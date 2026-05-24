import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  activateEntitlementForPayment,
  getBillingOrderByRazorpayOrderId,
  recordPayment,
  updateBillingOrderStatus,
  verifyRazorpayWebhookSignature
} from "@/lib/billing/server";
import { assertWebhookConfigured } from "@/lib/billing/server-env";
import { getPlan } from "@/lib/billing/plans";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PaymentStatus, RefundStatus } from "@/types/domain";

export const runtime = "nodejs";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  email?: string;
  contact?: string;
}

interface RazorpayRefundEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
  };
}

function paymentStatusFromRazorpay(status?: string): PaymentStatus {
  if (status === "captured") return "captured";
  if (status === "failed") return "failed";
  if (status === "authorized") return "authorized";
  if (status === "refunded") return "refunded";
  return "unknown";
}

function refundStatusFromRazorpay(status?: string): RefundStatus {
  if (status === "processed") return "processed";
  if (status === "failed" || status === "rejected") return "rejected";
  return "reviewing";
}

export async function POST(request: Request) {
  try {
    const config = assertWebhookConfigured();
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const eventId =
      request.headers.get("x-razorpay-event-id") ||
      `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const db = getAdminDb();
    const eventRef = db.collection("webhookEvents").doc(eventId);

    if (!signature || !verifyRazorpayWebhookSignature({ rawBody, signature, webhookSecret: config.webhookSecret })) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const existingEvent = await eventRef.get();
    if (existingEvent.exists && existingEvent.data()?.processed === true) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventType = payload.event || "unknown";
    const payment = payload.payload?.payment?.entity;
    const refund = payload.payload?.refund?.entity;
    const razorpayPaymentId = payment?.id || refund?.payment_id || null;
    const razorpayOrderId = payment?.order_id || null;

    await eventRef.set(
      {
        eventId,
        eventType,
        razorpayPaymentId,
        razorpayOrderId,
        processed: false,
        mode: config.mode,
        receivedAt: FieldValue.serverTimestamp(),
        processedAt: null,
        error: ""
      },
      { merge: true }
    );

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (!payment?.order_id || !payment.id) throw new Error("Webhook payment payload is incomplete.");
      const orderDoc = await getBillingOrderByRazorpayOrderId(payment.order_id);
      if (!orderDoc) throw new Error("Webhook order was not found in billingOrders.");
      const order = orderDoc.data();
      const plan = getPlan(String(order.planId));
      if (!plan) throw new Error("Webhook plan was not found.");

      await recordPayment({
        userId: String(order.userId),
        userEmail: String(order.userEmail || payment.email || ""),
        plan,
        orderId: orderDoc.id,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        amount: Number(payment.amount || order.amount || 0),
        currency: String(payment.currency || order.currency || config.currency),
        status: paymentStatusFromRazorpay(payment.status),
        verified: true,
        webhookConfirmed: true,
        mode: config.mode,
        rawSafeSummary: {
          eventType,
          method: payment.method || "",
          email: payment.email || "",
          contact: payment.contact || ""
        }
      });
      await updateBillingOrderStatus(orderDoc.id, "paid");
      await activateEntitlementForPayment({
        userId: String(order.userId),
        plan,
        paymentId: payment.id,
        orderId: orderDoc.id,
        source: config.mode === "test" ? "test" : "razorpay",
        mode: config.mode
      });
    }

    if (eventType === "payment.failed" && payment?.order_id && payment.id) {
      const orderDoc = await getBillingOrderByRazorpayOrderId(payment.order_id);
      if (orderDoc) {
        const order = orderDoc.data();
        const plan = getPlan(String(order.planId));
        if (plan) {
          await recordPayment({
            userId: String(order.userId),
            userEmail: String(order.userEmail || payment.email || ""),
            plan,
            orderId: orderDoc.id,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            amount: Number(payment.amount || order.amount || 0),
            currency: String(payment.currency || order.currency || config.currency),
            status: "failed",
            verified: false,
            webhookConfirmed: true,
            mode: config.mode,
            rawSafeSummary: {
              eventType,
              method: payment.method || "",
              email: payment.email || "",
              contact: payment.contact || ""
            }
          });
        }
        await updateBillingOrderStatus(orderDoc.id, "failed");
      }
    }

    if (eventType === "refund.processed" && refund?.payment_id) {
      await db.collection("refunds").doc(refund.id || `refund_${refund.payment_id}`).set(
        {
          paymentId: refund.payment_id,
          userId: "",
          userEmail: "",
          amount: Number(refund.amount || 0),
          currency: String(refund.currency || config.currency),
          status: refundStatusFromRazorpay(refund.status),
          reason: "Razorpay refund webhook",
          adminNote: "Imported from Razorpay webhook.",
          mode: config.mode,
          updatedAt: FieldValue.serverTimestamp(),
          processedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      await db.collection("payments").doc(refund.payment_id).set(
        {
          status: "refunded",
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    await eventRef.set(
      {
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        error: ""
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Webhook processing failed.";
    try {
      const db = getAdminDb();
      const eventId =
        request.headers.get("x-razorpay-event-id") ||
        `evt_error_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.collection("webhookEvents").doc(eventId).set(
        {
          eventId,
          eventType: "error",
          processed: false,
          processedAt: FieldValue.serverTimestamp(),
          error: message
        },
        { merge: true }
      );
    } catch {
      // Missing setup should still return a clean webhook response.
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
