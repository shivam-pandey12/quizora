# Site Settings

Phase 11 uses `siteSettings/app` for safe settings and `siteSettings/homepage` for featured homepage configuration.

Current settings include:

- Support email.
- App announcement.
- Public rooms, Quick Match, challenge links, leaderboards, and daily challenge feature flags.
- Default question timer.
- Default room max players.
- Default bot fill delay.
- Featured quiz limit.
- Maintenance-mode placeholder.

Public settings documents use `public: true`; admin-only writes remain protected by Firestore rules.

Dangerous settings should not be added until trusted backend enforcement exists.
