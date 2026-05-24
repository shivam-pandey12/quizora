# Creator Workflow

## Approval

1. User signs in normally.
2. Admin opens `/admin/creators`.
3. Admin sets `creatorStatus` to `approved`.
4. User can now open `/creator`.

## Class Creation

Approved creators can create private invite-only classes from `/creator/classes/create`.

On create:

- A `classes/{classId}` document is created.
- A teacher `classMembers/{classId_userId}` document is created.
- A `classInvites/{inviteCode}` document is created.
- The creator's class counters are updated.

## Creator Quizzes

Creator quiz drafts are class-use-first:

- Owner is the creator.
- Publish scope defaults to `class-only`.
- Review status starts as `draft`.
- Global catalog publishing remains admin-controlled.
