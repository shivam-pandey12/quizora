# Billing Security

Required guarantees:

- Never trust client amount or plan price.
- Create Razorpay Orders only on the server.
- Verify checkout signatures only on the server.
- Verify webhooks against the raw request body before JSON parsing.
- Keep webhook processing idempotent.
- Never let users write their own entitlements or mark payments paid.
- Store only safe payment summaries.
- Do not store full card, bank, or sensitive Razorpay payloads in client-readable Firestore.
- Log manual billing admin actions.

Current limitation: admin authority still follows the current Quizora admin profile strategy plus bootstrap email. Future production hardening should move sensitive admin authority to Firebase custom claims and trusted server/Admin SDK workflows.
