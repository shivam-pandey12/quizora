# Classroom Permissions

## Roles And Capabilities

Quizora keeps the existing `role` field stable:

- `user`
- `admin`

Creator and teacher access is controlled through profile capability fields:

- `creatorStatus: "none" | "pending" | "approved" | "suspended"`
- `teacherProfile`

Admins can approve or suspend creator access from `/admin/creators`.

## Access Rules

- Approved creators/admins can create classes.
- Class owners/admins can edit class settings, manage assignments, create class rooms, and export results.
- Students can join a class only with an active invite code.
- Students can read their own detailed submissions.
- Students can read safe class leaderboard rows.
- Students cannot read other students' answer snapshots or detailed submissions.
- Class-only rooms require active class membership.

## Future Hardening

For production-scale schools, move sensitive admin/creator authority to Firebase custom claims plus trusted server/Admin SDK writes.
