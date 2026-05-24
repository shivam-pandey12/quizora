# Live Room Server Hardening

Phase 14 preserves the existing Firestore real-time room UX while moving sensitive answer scoring and finalization to route handlers.

## Trusted Routes

- `/api/rooms/questions` returns room-safe questions.
- `/api/rooms/submit-answer` validates participant/host/bot access, duplicate answers, current question index, class membership, and scores on the server.
- `/api/rooms/finalize-question` writes skipped rows, room results, and host advancement from the server.
- `/api/rooms/finalize-room` creates a trusted live-room attempt for the current real user.

## Bot Policy

Bot rows are marked `isBot` and do not update real user stats or public leaderboards as real users. Host-triggered bot submissions are scored by the server route.

## Remaining Limits

This is not a Socket.IO rewrite. Firestore room state still drives the live UX, so Phase 14 is an incremental hardening step rather than full real-time server authority.

