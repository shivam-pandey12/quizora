# Phase 13 Monetization

Phase 13 adds Quizora paid access as time-limited digital passes using Razorpay Orders. It does not add prize tournaments, cash winnings, wallets, payouts, crypto, betting, or server-authoritative competition.

## Built Surface

- Public pricing page at `/pricing`.
- User billing pages at `/billing`, `/billing/history`, `/billing/success`, and `/billing/failed`.
- Razorpay API routes for order creation, checkout signature verification, and webhooks.
- Firestore billing collections: `entitlements`, `billingOrders`, `payments`, `webhookEvents`, `refunds`, `usageCounters`, and `billingAuditLogs`.
- Admin pages for billing overview, payments, entitlements, and refund tracking.
- Gentle feature gates and usage meters for premium flows.

## Source Of Truth

The static plan catalog in code is the trusted price source for Phase 13. Firestore entitlements are the access source of truth. User profile fields must not be treated as paid-access authority.

## Exclusions

Recurring Razorpay subscriptions, automated refunds, GST invoice automation, enterprise contracts, wallets, payouts, and prize contests remain future work.
