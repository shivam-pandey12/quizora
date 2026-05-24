import type { BillingMode } from "@/types/domain";

export const razorpayPublicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
export const isRazorpayPublicConfigured = Boolean(razorpayPublicKeyId);

export function getBillingMode(): BillingMode {
  if (process.env.BILLING_TEST_MODE === "true") return "test";
  if (razorpayPublicKeyId.startsWith("rzp_test")) return "test";
  return "live";
}

export function billingSetupMessage() {
  return "Razorpay checkout is not configured yet. Add NEXT_PUBLIC_RAZORPAY_KEY_ID plus server Razorpay keys, then restart the app.";
}
