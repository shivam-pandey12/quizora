"use client";

import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { PlanBadge, PriceLine } from "@/components/billing/billing-ui";
import { useAuth } from "@/lib/auth/auth-provider";
import { billingSetupMessage, isRazorpayPublicConfigured } from "@/lib/billing/config";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { billingFeatureLabels, getActivePlans, planPriority } from "@/lib/billing/plans";
import type { BillingPlanId } from "@/types/domain";

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string | null;
    email?: string | null;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PricingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const { plan: currentPlan, refreshEntitlements } = useEntitlement();
  const { showToast } = useToast();
  const [workingPlan, setWorkingPlan] = useState<BillingPlanId | null>(null);
  const plans = useMemo(() => getActivePlans(), []);

  async function startCheckout(planId: BillingPlanId) {
    if (planId === "free") {
      router.push(user ? "/dashboard" : "/register");
      return;
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/pricing?plan=${planId}`)}`);
      return;
    }
    if (!isRazorpayPublicConfigured) {
      showToast({
        tone: "error",
        title: "Checkout setup is missing",
        description: billingSetupMessage()
      });
      return;
    }

    setWorkingPlan(planId);
    try {
      const token = await user.getIdToken();
      const orderResponse = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });
      const orderData = (await orderResponse.json()) as {
        error?: string;
        keyId: string;
        amount: number;
        currency: string;
        razorpayOrderId: string;
        plan: { name: string };
      };
      if (!orderResponse.ok) throw new Error(orderData.error || "Could not create payment order.");

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Razorpay checkout could not load.");

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Quizora",
        description: `${orderData.plan.name} pass`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: profile?.displayName || user.displayName,
          email: profile?.email || user.email
        },
        theme: {
          color: "#b88a2d"
        },
        handler: async (response) => {
          try {
            const verifyToken = await user.getIdToken();
            const verifyResponse = await fetch("/api/billing/verify-payment", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${verifyToken}`
              },
              body: JSON.stringify(response)
            });
            const verifyData = (await verifyResponse.json()) as { error?: string };
            if (!verifyResponse.ok) throw new Error(verifyData.error || "Payment verification failed.");
            await refreshEntitlements();
            router.push(`/billing/success?plan=${planId}`);
          } catch (caught) {
            showToast({
              tone: "error",
              title: "Payment verification failed",
              description: caught instanceof Error ? caught.message : "Contact support with your payment ID."
            });
            router.push(`/billing/failed?plan=${planId}`);
          }
        },
        modal: {
          ondismiss: () => {
            showToast({ tone: "info", title: "Checkout closed", description: "No payment was recorded." });
          }
        }
      });
      checkout.open();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Checkout could not start",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorkingPlan(null);
    }
  }

  useEffect(() => {
    const requestedPlan = searchParams.get("plan") as BillingPlanId | null;
    if (requestedPlan && user && requestedPlan !== "free") {
      void startCheckout(requestedPlan);
    }
    // Auto-opening should run only when the login redirect lands back here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {plans.map((plan) => {
        const current = currentPlan.id === plan.id;
        const betterThanCurrent = planPriority[plan.id] > planPriority[currentPlan.id];
        return (
          <Card
            className={`relative p-5 ${plan.isFeatured ? "border-primary/45 shadow-glow" : ""}`}
            key={plan.id}
          >
            {plan.isFeatured ? (
              <Badge className="mb-4 text-primary">
                <Sparkles className="mr-1.5 size-3.5" />
                Popular
              </Badge>
            ) : null}
            {current ? <PlanBadge plan={plan} /> : null}
            <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">{plan.description}</p>
            <div className="mt-5">
              <PriceLine plan={plan} />
              <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">{plan.bestFor}</p>
            </div>
            <ul className="mt-5 grid gap-2 text-sm">
              {plan.features.slice(0, 6).map((feature) => (
                <li className="flex gap-2" key={feature}>
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{billingFeatureLabels[feature] ?? feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6"
              disabled={workingPlan === plan.id || (plan.id !== "free" && !isRazorpayPublicConfigured) || current}
              fullWidth
              onClick={() => void startCheckout(plan.id)}
              variant={current ? "secondary" : "primary"}
            >
              {workingPlan === plan.id ? <Loader2 className="size-4 animate-spin" /> : null}
              {current ? "Current plan" : plan.id === "free" ? "Start free" : betterThanCurrent ? `Upgrade to ${plan.name}` : `Get ${plan.name}`}
            </Button>
          </Card>
        );
      })}
      {!isRazorpayPublicConfigured ? (
        <Card className="border-warning/30 bg-warning/10 p-5 lg:col-span-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">Checkout is disabled until Razorpay keys are configured.</p>
              <p className="mt-1 text-sm text-muted-foreground">{billingSetupMessage()}</p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
