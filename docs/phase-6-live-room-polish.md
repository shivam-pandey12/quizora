# Phase 6 Live Room Polish

Phase 6 keeps the Phase 5 Firestore room engine and improves the multiplayer product surface without adding Socket.IO or server-authoritative scoring.

## Added Scope

- `/rooms` now uses fetch-based public discovery for public waiting rooms only. It does not attach a global real-time rooms listener.
- `/rooms/history` shows the signed-in user completed room results and hosted rooms.
- `/rooms/[roomCode]` remains the invite link. Signed-out users are routed through login, signed-in non-participants can join when the room is waiting and unlocked, and existing participants reuse the deterministic player document.
- Waiting lobbies support ready requirements, host lock/unlock, public/private visibility changes, kick before start, copy/share invite, and player heartbeat.
- Room results show basic analytics, admin-review status, and host rematch creation with a fresh room code.
- `/admin/rooms` has stronger filters and links to `/admin/rooms/[roomId]` for room diagnostics.
- `/admin/rooms/[roomId]` shows metadata, players, results, analytics, and admin-only suspicious flags.

## Listener Boundaries

- Public discovery fetches a limited window of public waiting rooms.
- Lobby listens to one room and its players.
- Play listens to one room, room players, and answers for the current question only.
- Result listens to one room and room results only.
- Admin pages use bounded fetches.

## Security And Anti-Abuse Notes

Suspicious flags are admin-only labels. Quizora does not auto-ban users or publicly accuse players. Phase 6 still uses client-side room scoring, and correct answers can be technically readable in the browser because the current question model includes answer keys. This is acceptable for casual live rooms, not prize tournaments.

Future hardening should move scoring, question delivery, room advancement, suspicious flag creation, and leaderboard writes to trusted server code or Cloud Functions.
