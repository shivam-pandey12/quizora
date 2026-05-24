# Quizora Firestore Plan

Phase 7 uses real Firestore-backed content, saved quiz attempts, leaderboard entries, profile gamification fields, live quiz rooms, public matchmaking, bot-fill metadata, and challenge invite documents. This document is still a planning and implementation guide; rules and indexes must be deployed and tested in the Firebase project before claiming production security.

## Implemented Through Phase 7

- `users`: Profile documents keyed by Firebase Auth UID. The frontend creates missing profiles with `role: "user"` and preserves stats while updating identity, XP, level, streaks, badges, category history, quick-match stats, challenge-room stats, and `lastActiveAt`.
- `categories`: Public category lanes with `name`, `slug`, `description`, `icon`, `accent`, `quizCount`, `featured`, `status`, `createdAt`, and `updatedAt`.
- `quizzes`: Quiz metadata with publishing state, category link/name, difficulty, visibility, tags, timing, question stats, featured/daily flags, and publish timestamps.
- `questions`: Top-level question documents keyed by generated ID with `quizId`, question type, prompt, options, correct answers, explanation, points, timing, order, and status.
- `attempts`: Completed play records keyed by generated ID or deterministic live-room ID with owner UID, `mode`, optional `roomId`/`roomCode`, quiz/category snapshots, score, totals, accuracy, time taken, XP earned, and answer snapshots for stable result review.
- `leaderboards`: Deterministic entries derived from completed attempts for global, quiz, and category scopes across all-time, daily, weekly, and monthly periods. Public reads are limited to non-hidden rows.
- `rooms`: Live quiz room state with room code, optional room title/description, host identity, quiz snapshot, visibility, lock state, status, timing, current question index, settings, analytics, admin-only anti-abuse flags, rematch link, and lifecycle timestamps.
- `roomPlayers`: Deterministic player records keyed by `roomId_userId` with role, lobby/play status, score, counts, avatar, presence timestamps, and optional bot metadata. Leave/rejoin reuses the same document.
- `roomAnswers`: Deterministic answer records keyed by `roomId_questionIndex_userId` to prevent duplicate submissions and preserve answer/question snapshots for room results. Bot answers use `roomId_questionIndex_bot_botId`.
- `roomResults`: Deterministic final room results keyed by `roomId_userId` with rank, score, XP preview, bot marker, and linked live-room attempt ID when a real participant saves their attempt.
- `matchmakingQueue`: Deterministic queue documents keyed by user ID for Quick Match preferences, queue status, expiration, matched room, and admin-only anti-abuse hints.
- `challenges`: Challenge invite documents linking creator, quiz, room ID/code, status, expiration, and accepted user.

## Planned For Later

- `reports`: Moderation and quality reports.
- `feedback`: Product and quiz quality feedback.
- `siteSettings`: Controlled homepage curation, daily challenge pointers, and feature flags.

## Security Notes

- Public reads should be limited to `published` + `public` quizzes and `active` categories.
- Admin writes currently rely on a `users/{uid}.role == "admin"` rule check and client-side `AdminGate`.
- Serious production hardening should add custom claims or trusted server validation before expanding admin workflows.
- Correct answers are still stored in `questions`. Public quiz detail pages do not load them, but the Phase 3 client play engine reads active questions for scoring, so competitive anti-cheat is not complete.
- Result pages use `attempts.answers` snapshots instead of live question documents so historical reviews survive question edits.
- Phase 4 leaderboard writes are client-side, tied to completed attempts, and constrained by rules where possible. Tournament-grade ranking still needs server-side scoring and server-only leaderboard writes.
- Phase 6 live rooms use fetch-based public room discovery, bounded Firestore room listeners, client-side answer submission/scoring, host-controlled advancement, and admin-only suspicious-room flags. Rules block obvious cross-user writes and answer overwrites, but serious tournaments need a server-authoritative room engine, hidden correct answers, rate limits, and Cloud Functions or a dedicated realtime service.
- Phase 7 matchmaking remains Firestore/Web SDK and host-client assisted. Rules block obvious queue/bot/challenge abuse, but bots and matching are not server-authoritative and should not be used for prize or high-stakes competition.
