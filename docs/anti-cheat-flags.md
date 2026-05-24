# Anti-Cheat Flags

Phase 14 adds lightweight review signals. These are admin-facing only and should not be shown as public accusations.

## Signals

- impossible or very fast completion,
- perfect score with suspicious timing,
- duplicate submission attempts,
- expired session submission,
- unknown question ids in payload,
- modified question order,
- large timing drift,
- room duplicate answer attempts.

## Attempt Fields

- `securityFlags`
- `suspiciousScore`
- `reviewStatus`
- `hiddenFromLeaderboard`

Quizora does not auto-ban users in Phase 14. Admins can review, clear, hide, or restore leaderboard visibility.

