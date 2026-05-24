import "server-only";

import type { BillingMode } from "@/types/domain";

export interface BillingServerConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  currency: string;
  mode: BillingMode;
  supportEmail: string;
}

export function getBillingServerConfig(): BillingServerConfig {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const currency = process.env.BILLING_CURRENCY || "INR";
  const mode: BillingMode =
    process.env.BILLING_TEST_MODE === "true" || keyId.startsWith("rzp_test") ? "test" : "live";

  return {
    keyId,
    keySecret,
    webhookSecret,
    currency,
    mode,
    supportEmail: process.env.BILLING_SUPPORT_EMAIL || "support@quizora.app"
  };
}

export function assertRazorpayServerConfigured() {
  const config = getBillingServerConfig();
  if (!config.keyId || !config.keySecret) {
    throw new Error("Razorpay server keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return config;
}

export function assertWebhookConfigured() {
  const config = getBillingServerConfig();
  if (!config.webhookSecret) {
    throw new Error("Razorpay webhook secret is missing. Add RAZORPAY_WEBHOOK_SECRET.");
  }
  return config;
}
