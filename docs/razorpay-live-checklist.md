# Razorpay Live Checklist

Quizora Phase 13 uses Razorpay Orders and time-limited digital access passes. It does not implement subscriptions, wallets, payouts, prize pools, or cash tournaments.

## Test Mode

- Use `rzp_test_*` keys.
- Set `BILLING_TEST_MODE=true`.
- Complete checkout from `/pricing`.
- Confirm `/api/billing/create-order` creates an order.
- Confirm `/api/billing/verify-payment` verifies the checkout signature.
- Confirm `/billing` shows the entitlement and payment history.

## Live Mode

- Activate the Razorpay account and complete required business/KYC setup.
- Review tax/GST, refund, privacy, and terms obligations.
- Replace all Razorpay test keys with live keys.
- Set `BILLING_TEST_MODE=false`.
- Confirm `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` belong to the same mode.

## Webhook

Configure:

```text
https://your-production-domain.com/api/billing/razorpay-webhook
```

Enable:

- `order.paid`
- `payment.captured`
- `payment.failed`
- `refund.processed`

Set `RAZORPAY_WEBHOOK_SECRET` in production. The webhook handler verifies the raw request body before JSON parsing and records idempotent `webhookEvents`.

## Safety Checks

- Failed/cancelled payments must not activate entitlements.
- Duplicate webhook delivery must not duplicate entitlements.
- Users cannot write entitlements or mark payments paid through client SDK.
- Admin refund tracking is manual; automatic refund API calls are intentionally excluded.

