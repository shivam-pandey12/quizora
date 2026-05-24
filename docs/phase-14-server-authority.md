# Phase 14 Server Authority

Phase 14 moves new solo and assignment quiz scoring to trusted Next.js route handlers backed by the Firebase Admin SDK. The client starts an attempt session, receives only safe question data, submits answers plus a signed session token, and the server writes the attempt, stats, assignment submission, and trusted leaderboard rows.

## Added API Routes

- `POST /api/attempts/start` creates `attemptSessions/{id}` and returns safe `PlayQuestion` data.
- `POST /api/attempts/submit` validates the signed session token, scores answers server-side, and returns the result path.
- `POST /api/rooms/questions` returns safe room questions.
- `POST /api/rooms/submit-answer` scores room answers server-side.
- `POST /api/rooms/finalize-question` creates skipped answer rows and advances/finalizes the room.
- `POST /api/rooms/finalize-room` creates the current user's trusted live-room attempt from the trusted room result.

## What Is Trusted Now

- New solo attempts.
- New assignment attempts and assignment submissions.
- New public leaderboard writes from trusted attempts.
- Live-room answer scoring and room finalization paths when clients call the Phase 14 route handlers.

## Legacy Compatibility

Old client-scored attempts are still readable and are mapped as `scoringSource: "client"` and `trusted: false`. Public leaderboards now prefer trusted, non-hidden, non-bot rows; admin review tools can still inspect legacy rows.

## Deploy

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

