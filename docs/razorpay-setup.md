# Razorpay Setup

Add these environment variables:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BILLING_CURRENCY=INR
BILLING_TEST_MODE=true
BILLING_SUPPORT_EMAIL=
SUPPORT_EMAIL=
```

Only `NEXT_PUBLIC_RAZORPAY_KEY_ID` may be exposed to the browser. Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET`.

## Local Firebase Admin

Next.js billing API routes need Firebase Admin SDK credentials to verify ID tokens and write trusted billing records. Use one of:

- Application default credentials on the host.
- `FIREBASE_SERVICE_ACCOUNT_JSON`.
- `FIREBASE_SERVICE_ACCOUNT_BASE64`.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

## Production Notes

Before live payments:

- Activate the Razorpay account properly.
- Verify business/KYC requirements.
- Review tax/GST obligations.
- Review privacy, terms, contact, and refund pages.
- Set `BILLING_TEST_MODE=false`.
- Configure the production webhook endpoint: `https://YOUR_DOMAIN/api/billing/razorpay-webhook`.
- Enable `order.paid`, `payment.captured`, `payment.failed`, and `refund.processed`.
- Confirm duplicate webhook delivery does not duplicate entitlements.

Do not include secret values in docs, screenshots, tickets, or client-side code.
