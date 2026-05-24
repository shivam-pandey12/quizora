# Admin Audit Log

`adminLogs` records concise admin actions.

Fields:

- `adminId`
- `adminName`
- `action`
- `targetType`
- `targetId`
- `targetLabel`
- `details`
- `createdAt`

Logs avoid sensitive answer snapshots and private report details. They are admin-only in Firestore rules.

Phase 11 logging is best-effort client logging. Production-grade audit logging should be server-side so privileged actions and logs are committed together.
