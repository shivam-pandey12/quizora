# Quizora Phase 12 Classroom And Creator Foundation

Phase 12 adds private classroom and creator workflows on top of the existing Quizora quiz, rooms, admin, and SEO systems.

## What Shipped

- Creator workspace: `/creator`, `/creator/classes`, `/creator/classes/create`, class tabs, creator assignments, creator results, and creator quiz drafts.
- Student workspace: `/classes`, `/classes/join`, class detail tabs, assignment detail, and assignment result.
- Admin operations: `/admin/classes` and `/admin/creators`.
- Classroom collections: `classes`, `classMembers`, `classInvites`, `assignments`, `assignmentSubmissions`, and safe `classLeaderboardRows`.
- Assignment mode reuses the existing quiz play engine and writes normal attempts with `mode: "assignment"`.
- Class live rooms reuse the existing live-room engine with `source: "class-room"` and member-only joins.
- Creator access keeps `role: "user" | "admin"` stable and uses `creatorStatus` for admin-granted teacher/creator access.

## Route Privacy

All classroom and creator routes are private and noindex. They are not included in the sitemap:

- `/creator/*`
- `/classes/*`
- `/assignments/*`
- `/admin/classes`
- `/admin/creators`

## Known Limitations

- Assignment scoring is still client-assisted, like solo play.
- Class analytics are bounded and recent-data based, not a full analytics warehouse.
- Creator quiz publishing to the global catalog remains admin-controlled.
- Real rate limiting, custom claims, server-authoritative scoring, email reminders, and LMS integrations remain future work.

## Phase 13 Readiness

Phase 13 can layer monetization and plan gating over this foundation without changing the classroom collection names.
