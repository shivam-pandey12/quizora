# Rollback Plan

## Code Rollback

1. Identify the last known good deployment.
2. Redeploy that build or revert the release commit.
3. Restart the app process.
4. Re-run public, auth, quiz, billing, and admin smoke checks.

## Firebase Rules Rollback

1. Keep a copy of the last deployed `firestore.rules`.
2. Revert the local rules file to the known good version.
3. Deploy:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Index Rollback

Indexes can take time to build and should rarely be deleted during an incident. If a query fails, add the exact missing index and deploy indexes. Remove unused indexes only after the affected code path is gone and production has stabilized.

## Operational Kill Switches

Use existing admin/site settings where practical:

- maintenance copy/status
- public rooms visibility controls
- quick match flags
- challenge links flags
- leaderboard visibility moderation
- daily challenge/featured content controls

Billing and trusted scoring do not have a full production kill-switch service in Phase 15; use env/config deployment changes and admin tools if a critical issue appears.

## Data Recovery

- Use Firestore export/backup before major launch changes.
- Preserve soft-archive/hidden content over deletion.
- Use admin import/export tools for content recovery when practical.
- Payment and entitlement records should be corrected through admin entitlement tools, not direct client writes.
