# Billing Architecture

Quizora billing uses a server-owned flow:

1. The signed-in client requests `/api/billing/create-order` with a plan id.
2. The server verifies the Firebase ID token.
3. The server calculates the amount from the trusted plan catalog.
4. The server creates a Razorpay Order and stores a `billingOrders` record.
5. Razorpay Checkout returns payment ids to the client.
6. The client calls `/api/billing/verify-payment`.
7. The server verifies the Razorpay signature and activates an entitlement with `webhookConfirmed=false`.
8. `/api/billing/razorpay-webhook` verifies the raw webhook body and reconciles payment/entitlement state.

Client SDK reads are owner-scoped. Payment, order, entitlement, webhook, and refund writes are server/admin-owned.

## Collections

- `billingOrders`: Razorpay order summaries.
- `payments`: safe payment summaries only.
- `entitlements`: active, expired, revoked, or pending access records.
- `webhookEvents`: idempotency and webhook processing state.
- `refunds`: manual refund tracking and Razorpay refund webhook mirrors.
- `billingAuditLogs`: admin billing actions.
- `usageCounters`: lightweight limit-tracking placeholders.
