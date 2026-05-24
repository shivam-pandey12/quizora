# Firestore Rules Notes

The Phase 14 rules are designed to protect client SDK access while trusted Next.js route handlers perform sensitive Admin SDK writes.

## Public Data

- Published public quizzes are readable.
- Active categories are readable.
- Trusted, non-hidden, non-bot leaderboard rows are public-readable.
- Admins can read hidden leaderboard rows for moderation.
- Signed-in users can look up rooms by room code to preserve invite links.

## Private Data

- User profiles are self-readable and admin-readable.
- Attempts are owner-readable and admin-readable.
- Room answers and room results are participant/host/admin readable.
- Matchmaking queue list reads are admin-only.
- Challenge list reads are admin-only; direct challenge reads require auth.
- Reports, feedback, and admin logs are admin-only after creation.
- Daily challenge documents are public-readable only for safe active/scheduled metadata.
- Billing plans are public-readable only when active and safe.
- Entitlements, billing orders, payments, refunds, and usage counters are owner-readable and admin-readable.
- Webhook events and billing audit logs are admin-only.

## Write Boundaries

- Users cannot self-promote by changing `role`.
- Attempt sessions are server-only; clients cannot create or update them.
- Attempts are server/admin-write only; clients cannot create trusted attempts or update scores.
- Leaderboard entries are server/admin-write only; clients cannot write rank, trusted, hidden, or suspicious fields.
- Host/admin controls guard room start, cancel, advancement, bot fill, skipped answers, results, lock, and visibility behavior.
- Normal users can update only safe room presence fields on their room player document.
- Room answers and room results are server/admin-write only in the Phase 14 trusted path.
- Matchmaking queue documents are deterministic by user ID.
- User-created reports and feedback cannot set admin notes, resolver fields, or privileged statuses.
- Normal users cannot create leaderboard moderation fields such as `suspicious`, `reviewed`, or `moderatedBy`.
- Admin logs are admin-only and should contain concise non-sensitive details.
- Users cannot write their own entitlements, billing orders, payment status, refunds, webhook events, usage counters, or billing audit logs.
- Admins can manage manual billing records, but Razorpay order/payment truth should flow through trusted API routes.

## Known Rule Limitations

- Firestore rules protect client SDK access, but Admin SDK writes bypass rules by design.
- Old legacy client-scored attempts remain readable and should be treated as casual history.
- Private room code lookup is not tournament-grade private while the client queries `rooms` by `roomCode`.
- Firestore live rooms are incrementally hardened, but not a full stateful room server.
- Serious production hardening should move admin roles to custom claims and sensitive writes to trusted backend code.
- Phase 11 admin audit logs are client best-effort; server-side logs are recommended for production-grade accountability.
- Phase 13 API routes use Firebase Admin SDK, so server writes bypass Firestore rules. Rules still protect every client SDK billing read/write path.
- Current admin authority is still profile-role based. Custom claims should replace this for high-stakes billing operations.
