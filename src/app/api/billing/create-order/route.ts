import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { amountToSubunits, createBillingOrderRecord, receiptFor } from "@/lib/billing/server";
import { assertRazorpayServerConfigured } from "@/lib/billing/server-env";
import { getPlan } from "@/lib/billing/plans";
import { verifyFirebaseBearerToken } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const decoded = await verifyFirebaseBearerToken(request);
    const { planId } = (await request.json()) as { planId?: string };
    const plan = getPlan(planId);

    if (!plan || !plan.isActive || plan.id === "free") {
      return NextResponse.json({ error: "Choose an active paid Quizora plan." }, { status: 400 });
    }

    const config = assertRazorpayServerConfigured();
    const amount = amountToSubunits(plan.priceINR);
    const receipt = receiptFor(decoded.uid, plan.id);
    const razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret
    });
    const order = await razorpay.orders.create({
      amount,
      currency: config.currency,
      receipt,
      notes: {
        userId: decoded.uid,
        planId: plan.id,
        product: "Quizora"
      }
    });

    const internalOrderId = await createBillingOrderRecord({
      userId: decoded.uid,
      userEmail: decoded.email || "",
      plan,
      razorpayOrderId: order.id,
      amount,
      currency: config.currency,
      receipt,
      mode: config.mode
    });

    return NextResponse.json({
      orderId: internalOrderId,
      razorpayOrderId: order.id,
      amount,
      currency: config.currency,
      keyId: config.keyId,
      mode: config.mode,
      plan: {
        id: plan.id,
        name: plan.name,
        priceINR: plan.priceINR,
        durationDays: plan.durationDays
      }
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not create Razorpay order.";
    const status = message.includes("missing") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
