# Phase 3 Security Notes

Phase 3 is built for normal learning attempts, saved results, XP foundations, and private answer review. It is not a competitive anti-cheat system yet.

## Current Phase 3 Behavior

- Play is login-required.
- Public quiz detail pages do not load questions or correct answers.
- The `/play/[quizId]` route loads active question documents so the client can score the submitted attempt.
- Correct answers are never rendered in the player UI before final submission.
- Result review reads saved attempt snapshots, not live question documents.
- Firestore rules require attempt `userId` to match the signed-in user on create.
- Users can read their own attempts; admins can read attempts through role-gated rules.

## Known Limitation

Because scoring runs in the browser in Phase 3, answer keys are technically available to a motivated user during play. This is acceptable for a learning platform foundation, but not for money tournaments, prize contests, or serious ranked leaderboard integrity.

## Phase 4+ Hardening

- Phase 4 adds client-side leaderboard entries tied to saved attempts, but this is still not tournament-grade.
- Phase 5 adds Firestore live rooms with client-side scoring and host-controlled advancement, which is suitable for casual rooms but not prize-grade competition.
- Move scoring to a trusted server action, API route, or Cloud Function.
- Deliver public-safe question payloads without correct answers during play.
- Use attempt session tokens with expiration.
- Add rate limiting and duplicate-attempt protection on trusted infrastructure.
- Validate leaderboard writes from completed attempts only.
- Use custom claims or server validation for admin authorization.
- Add suspicious-attempt detection before competitive ranking.
