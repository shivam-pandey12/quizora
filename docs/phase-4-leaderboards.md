# Phase 4 Leaderboards And Gamification

Phase 4 adds real leaderboard entries, upgraded XP, daily streaks, profile badges, result sharing, and admin leaderboard visibility.

## Ranking

Leaderboard entries use deterministic document IDs:

```text
{scope}_{scopeId}_{periodType}_{periodKey}_{userId}
```

Ranking uses:

1. Higher score
2. Higher accuracy
3. Lower time taken
4. Earlier completion time

`rankScore` is a sortable helper:

```text
score * 1,000,000 + accuracy * 1,000 - cappedTimeTakenSeconds
```

## Periods

- `all-time`: `all`
- `daily`: UTC `YYYY-MM-DD`
- `weekly`: UTC ISO-style week key
- `monthly`: UTC `YYYY-MM`

Daily streaks use the user's local browser date in Phase 4. This is good enough for a learning foundation, but a future competitive phase should move streak calculation to trusted server time.

## Security Limitation

Phase 4 still uses client-side scoring and client-side leaderboard writes. Firestore rules restrict obvious abuse, but serious ranked competition needs server-side scoring, attempt sessions, rate limits, and server-only leaderboard writes.
