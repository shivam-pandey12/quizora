# Admin Operations

## Routes

- `/admin`: command center and quick actions.
- `/admin/analytics`: bounded analytics and quiz performance samples.
- `/admin/quizzes`: quiz CRUD and SEO/content warnings.
- `/admin/questions`: question quality review.
- `/admin/users`: bounded user directory and role visibility.
- `/admin/attempts`: attempt review and suspicious timing signals.
- `/admin/reports`: content/safety report triage.
- `/admin/feedback`: user feedback triage.
- `/admin/leaderboards`: leaderboard moderation.
- `/admin/rooms`: live room and matchmaking monitor.
- `/admin/daily-challenge`: daily challenge control.
- `/admin/featured`: homepage content curation.
- `/admin/import-export`: bounded exports and draft imports.
- `/admin/audit-log`: read-only admin activity.
- `/admin/settings`: safe site defaults and feature flags.

## Operating Principles

- Prefer hide/archive/review over destructive deletion.
- Keep suspicious flags admin-only.
- Keep reports, feedback, and audit logs private.
- Treat analytics as recent samples until scheduled aggregation exists.
- Confirm visibility-changing and destructive actions.
