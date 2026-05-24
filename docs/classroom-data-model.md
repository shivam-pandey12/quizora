# Classroom Data Model

## Collections

`classes`

- Private invite-only class owned by a creator/teacher/admin.
- Key fields: `name`, `slug`, `description`, `subject`, `gradeLevel`, `ownerId`, `ownerName`, `status`, `visibility`, `inviteCode`, `memberCount`, `assignmentCount`, `roomCount`.

`classMembers`

- Deterministic document ID: `{classId}_{userId}`.
- Key fields: `classId`, `userId`, `displayName`, `photoURL`, `role`, `status`, `joinedAt`, `lastActiveAt`, `stats`.
- Student emails are not intended for student-facing reads.

`classInvites`

- Document ID is the invite code.
- Key fields: `classId`, `inviteCode`, `createdBy`, `status`, `expiresAt`, `maxUses`, `usedCount`.

`assignments`

- Teacher-created quiz work for a class.
- Key fields: `classId`, `quizId`, `title`, `instructions`, `dueAt`, `status`, `allowLateSubmission`, `attemptLimit`, `showResultsImmediately`.

`assignmentSubmissions`

- Deterministic document ID: `{assignmentId}_{userId}`.
- Stores the submitted attempt reference and score summary.

`classLeaderboardRows`

- Safe student-readable class ranking rows.
- Deterministic document ID: `{classId}_{userId}`.
- Does not include email or answer snapshots.

## Existing Extensions

- `attempts.mode` now supports `assignment`.
- `rooms.source` now supports `class-room`.
- `quizzes` now include creator ownership and review metadata.
