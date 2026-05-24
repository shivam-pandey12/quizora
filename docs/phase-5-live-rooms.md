# Phase 5 Live Rooms

Phase 5 adds login-required live quiz rooms using Firestore real-time listeners. It is designed for small and medium casual rooms, not prize tournaments or massive public events.

## Room Sync Model

- `rooms` is the source of truth for status, current question index, and question timer timestamps.
- `roomPlayers` tracks lobby/play status and live score for one room only.
- `roomAnswers` uses deterministic IDs: `roomId_questionIndex_userId`, so duplicate answer submission is blocked by transaction reads before writes.
- `roomResults` uses deterministic IDs: `roomId_userId`, so final podium rows are idempotent.
- Each participant saves a normal `attempt` with `mode: "live-room"`, `roomId`, and `roomCode` when they reach the room result page.

## Listener Boundaries

Live room pages listen only to:

- one room document query by room code,
- players for that room,
- answers for the current question,
- final results for that room.

They do not listen to all rooms, all answers, or all attempts globally.

## Security Limitation

Phase 5 still uses client-side question reads and client-side scoring. Correct answers are not shown in the UI before review, but they may be technically available in the browser because the Phase 3 question model includes answer keys.

Future tournament-grade live rooms should move to a server-authoritative engine with hidden correct answers, server-side scoring, room session tokens, rate limits, host migration, and Cloud Functions or a dedicated realtime service.
