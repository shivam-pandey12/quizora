# Classroom Indexes

Phase 12 adds composite indexes for bounded classroom queries.

## Added Query Families

- `classes`: owner-created class lists and admin status lists.
- `classMembers`: class rosters and user's joined classes.
- `assignments`: class assignment lists and published due-date views.
- `assignmentSubmissions`: assignment reports, class exports, and student histories.
- `classLeaderboardRows`: safe class leaderboard reads.
- `attempts`: class and assignment-mode attempt history.
- `rooms`: class-room history and class-room source filtering.
- `quizzes`: creator-owned quiz lists and creator review filtering.

## Deploy

```bash
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules
```

If Firebase reports a missing index in development, open the generated console link, compare it with `firestore.indexes.json`, then add the exact query shape before deploying.
