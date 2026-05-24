# Reports And Feedback Workflow

## Reports

Users can report quizzes and result-review questions. Reports include target metadata, reason, details, priority, and workflow status.

Admin statuses:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

Admins can add notes, change priority, and open the related target. User-created reports cannot set admin notes, resolver fields, or non-open statuses.

## Feedback

Signed-in users can submit feedback from `/contact`.

Feedback statuses:

- `new`
- `reviewing`
- `done`
- `dismissed`

Feedback is admin-only and should not collect passwords, secrets, or private answer details.

## Abuse Notes

Firestore rules validate ownership, field sets, status defaults, string lengths, and admin-only updates. Real rate limiting still needs backend enforcement.
