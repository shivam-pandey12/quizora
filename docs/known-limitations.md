# Known Limitations

## Casual-Grade Competition

Quizora Phase 14 supports trusted scoring for new solo/assignment attempts and hardened live-room scoring paths. It is still not a prize tournament platform.

## Answer Exposure

New play sessions use `/api/attempts/start` and receive safe questions without correct answers. Admin/question management still stores answer keys in Firestore question documents, so client code must continue using the trusted route handlers for play.

## Client-Originated Stats

New attempts, XP/streak/badge updates, assignment submissions, and public leaderboard writes originate from trusted route handlers. Legacy client-scored attempts remain readable as old history. Matchmaking queue state and parts of room orchestration are still client-assisted.

## Admin Roles

Admin access currently depends on `users/{uid}.role`. Users cannot update their own role, but production-grade admin authority should use custom claims and trusted server validation.

## Admin Operations

Phase 11 admin analytics are bounded samples and count queries, not a BI warehouse. Reports, feedback, leaderboard moderation, settings, and audit logs are protected by rules. High-impact admin authority should move to custom claims and server-only mutation endpoints over time.

## Private Room Lookup

Invite links use `/rooms/[roomCode]` and query rooms by room code from the client. The rules preserve this behavior for signed-in users, but a dedicated safe lookup endpoint is recommended for stronger private-room privacy.

## Rate Limiting

Phase 14 blocks duplicate trusted submissions where practical, but real distributed rate limiting needs a backend store, Cloud Functions, or another shared rate-limit service.

## Scale

Firestore listeners are scoped to rooms and queues, and list queries use limits. Massive public events, high-scale matchmaking, and authoritative room ticks should move to a server room engine or Socket.IO planning phase.

## Import/Export

Admin imports create draft or hidden content only. Large content migrations should use reviewed scripts or trusted backend tooling.

## Legal And Payments

Privacy, terms, and refund pages are practical launch placeholders. They need owner/legal review before serious live payment scale. Quizora has no cash prizes, wallets, payouts, betting, or gambling-like mechanics.

## Analytics And Monitoring

Phase 15 documents an event/error plan but does not install a dedicated analytics or error tracking SDK. Production monitoring still depends on host logs, Firebase Console, Razorpay dashboard, admin reports, and any future observability service added later.

## Dependency Audit Notes

`npm audit --omit=dev` currently reports moderate upstream transitive advisories in the `next` and `firebase-admin` dependency trees. The suggested npm force fixes are breaking/downgrade paths, so do not run `npm audit fix --force` blindly before launch. Track stable upstream releases and update intentionally after a build, smoke, billing, and trusted-scoring verification pass.
