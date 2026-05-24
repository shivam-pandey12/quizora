import { NextResponse } from "next/server";
import {
  activateEntitlementForPayment,
  getBillingOrderByRazorpayOrderId,
  recordPayment,
  updateBillingOrderStatus,
  verifyRazorpayPaymentSignature
} from "@/lib/billing/server";
import { assertRazorpayServerConfigured } from "@/lib/billing/server-env";
import { getPlan } from "@/lib/billing/plans";
import { verifyFirebaseBearerToken } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface VerifyPaymentBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await verifyFirebaseBearerToken(request);
    const body = (await request.json()) as VerifyPaymentBody;
    const razorpayOrderId = body.razorpay_order_id || "";
    const razorpayPaymentId = body.razorpay_payment_id || "";
    const razorpaySignature = body.razorpay_signature || "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
    }

    const config = assertRazorpayServerConfigured();
    const valid = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      keySecret: config.keySecret
    });

    if (!valid) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const orderDoc = await getBillingOrderByRazorpayOrderId(razorpayOrderId);
    if (!orderDoc) return NextResponse.json({ error: "Billing order was not found." }, { status: 404 });

    const order = orderDoc.data();
    if (order.userId !== decoded.uid) {
      return NextResponse.json({ error: "This payment belongs to a different account." }, { status: 403 });
    }

    const plan = getPlan(String(order.planId));
    if (!plan) return NextResponse.json({ error: "Plan is no longer available." }, { status: 400 });

    await recordPayment({
      userId: decoded.uid,
      userEmail: decoded.email || order.userEmail || "",
      plan,
      orderId: orderDoc.id,
      razorpayOrderId,
      razorpayPaymentId,
      amount: Number(order.amount || 0),
      currency: String(order.currency || config.currency),
      status: "authorized",
      verified: true,
      webhookConfirmed: false,
      mode: config.mode,
      rawSafeSummary: {
        source: "checkout",
        planId: plan.id
      }
    });
    await updateBillingOrderStatus(orderDoc.id, "paid");
    const entitlementId = await activateEntitlementForPayment({
      userId: decoded.uid,
      plan,
      paymentId: razorpayPaymentId,
      orderId: orderDoc.id,
      source: config.mode === "test" ? "test" : "razorpay",
      mode: config.mode
    });

    return NextResponse.json({
      ok: true,
      status: "verified",
      webhookConfirmed: false,
      entitlementId,
      plan: {
        id: plan.id,
        name: plan.name,
        durationDays: plan.durationDays
      }
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Payment verification failed.";
    const status = message.includes("missing") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
