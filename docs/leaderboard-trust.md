# Leaderboard Trust

Trusted leaderboard rows are written only from server route handlers or admin actions. Client SDK writes to `leaderboards` are blocked by Firestore rules.

## Trusted Row Metadata

- `trusted: true`
- `sourceAttemptId`
- `scoringSource: "server"`
- `updatedBy: "server"` or `"admin"`
- `botEntry: false` for real users
- `reviewStatus`
- `suspicious`

Public leaderboard queries filter for trusted, visible, non-bot rows. Legacy rows stay available to admins for review and migration decisions.

## Rebuilds

Future rebuild tools should rebuild from trusted attempts only unless an admin explicitly includes legacy data.

