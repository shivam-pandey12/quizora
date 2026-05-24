# Phase 7 Matchmaking Notes

Phase 7 keeps live rooms on the existing Firestore room engine and adds casual matchmaking around it.

## Collections

- `matchmakingQueue/{userId}`: deterministic one-entry-per-user queue state for Quick Match. Queue entries can be `searching`, `matched`, `cancelled`, or `expired`.
- `challenges/{challengeId}`: invite link metadata pointing to a normal challenge-source live room.
- `rooms`: existing room documents now support `source`, `matchmakingEnabled`, `preferredPlayerCount`, `minPlayersToStart`, `allowBotFill`, `botFillAt`, `botFillUsed`, `matchmakingStatus`, `queueCreatedBy`, and `challengeId`.
- `roomPlayers`, `roomAnswers`, `roomResults`: bot players use deterministic IDs such as `roomId_bot_astra`, and are marked with `isBot: true`.

## Matching Order

1. Exact selected quiz in a public waiting Quick Match room.
2. Compatible category/difficulty/player-count Quick Match room.
3. Any compatible public waiting Quick Match room.
4. Create a new public Quick Match room.

## Bot Fill

Bots are host-client assisted in Phase 7. The host can fill missing seats after `botFillAt` when `allowBotFill` is enabled. Bot answers are deterministic enough to avoid duplicate writes and use simple accuracy probabilities by difficulty. Bot players never create real user attempts or real user leaderboard entries.

## Security Limitation

This phase blocks obvious abuse with deterministic IDs and Firestore rules, but it is not tournament-grade. Serious competitive modes need server-side room orchestration, hidden answer delivery, server-side scoring, rate limits, and server-only leaderboard writes.
