# Phase 11 Admin Tools

Phase 11 turns Quizora Studio into an operations command center without adding payments, classroom mode, Socket.IO, or server-authoritative scoring.

## Built Areas

- Admin overview and analytics use bounded count queries and recent samples.
- Question quality review highlights missing explanations, reports, low correct-rate samples, and skipped-rate samples.
- Reports and feedback workflows store user submissions in admin-only queues.
- Featured and daily challenge controls use existing quiz/category flags plus safe settings documents.
- Leaderboard moderation hides, flags, and reviews rows without deleting attempts.
- Import/export tools are conservative: exports are bounded, imports create draft/hidden content only.
- Data cleanup diagnostics surface issues for manual review instead of running destructive bulk deletes.
- Admin audit logs record important actions with concise, non-sensitive details.

## Collections

- `reports`
- `feedback`
- `dailyChallenges`
- `siteSettings`
- `adminLogs`
- Existing `quizzes`, `categories`, `questions`, `attempts`, `leaderboards`, `rooms`, and `matchmakingQueue`

## Safety Notes

Admin gates still depend on `users/{uid}.role` and Firestore rules. Production hardening should move privileged operations to custom claims and trusted backend/Admin SDK writes.

## Phase 12 Prep

The admin tools are intentionally content-operations focused. Teacher/classroom workflows can build on these content, reporting, and export foundations later.
