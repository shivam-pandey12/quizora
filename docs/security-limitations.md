# Security Limitations

Quizora Phase 14 moves new solo, assignment, and most live-room scoring paths to trusted Next.js route handlers. The client no longer receives correct answers during new play sessions, and trusted attempts/leaderboards are written from server code.

## Trusted Scoring Boundaries

New solo and assignment attempts use `attemptSessions`, signed session tokens, safe question delivery, server scoring, server stats writes, and trusted leaderboard writes. Old attempts remain readable as legacy `trusted: false` data.

Remaining hardening:

- Durable distributed rate limits for attempt/session endpoints.
- Full trusted leaderboard rebuild jobs.
- Deeper replay detection and device/session abuse analytics.
- Custom claims for admin authority.

## Firestore Live Rooms

Live rooms still use Firestore listeners for the real-time UX. Phase 14 adds server-scored room answers and trusted finalization routes, but it is not a Socket.IO or fully stateful real-time server rewrite.

Remaining hardening:

- Full server-owned room timing.
- Strong reconnect/session validation.
- Dedicated room engine for high-stakes competitions.
- Durable room answer rate limits.

## Matchmaking And Bots

Quick match and queue cleanup are still mostly client-assisted. Bot room answers are scored through the trusted room route when using the Phase 14 client, and bot entries are marked so they do not appear as real-user public leaderboard rows.

Future hardening:

- Server-side queue processing.
- Bot fill controlled by trusted backend jobs.
- Queue and room creation rate limits.
- Strong stale-queue cleanup.

## Admin Authority

Quizora still uses `users/{uid}.role == "admin"` plus the bootstrap admin email strategy for admin checks. Users cannot self-change role under the rules except the configured bootstrap flow, but custom claims remain the recommended production authority model.

Future hardening:

- Firebase custom claims.
- Server-side admin mutation endpoints.
- Audit logging for destructive admin actions.
