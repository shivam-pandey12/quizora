# Trusted Scoring

Quizora trusted scoring uses server-only question reads. Correct answers and explanations are not sent to the play page before submission.

## Start

`/api/attempts/start` verifies the Firebase ID token, checks quiz or assignment access, loads active questions with the Admin SDK, creates an `attemptSessions` document, and returns:

- `attemptSessionId`
- signed short-lived `sessionToken`
- safe quiz metadata
- safe questions with id, type, prompt, options, image, points, time limit, and order

## Submit

`/api/attempts/submit` verifies:

- authenticated user owns the session,
- session is active and not expired,
- signed token matches the stored token hash,
- submitted question ids match the session order,
- answer payload does not include unknown questions.

The server calculates score, total points, accuracy, XP, streaks, badges, user stats, assignment submissions, and trusted leaderboard rows. Client-provided score, accuracy, XP, rank, and leaderboard fields are ignored.

## Supported Question Types

- Single-choice: exact option id/value match.
- Multiple-choice: exact selected set match.
- True/false: exact answer match.
- Text: simple normalized exact match through the existing scoring helper.
- Skipped answers earn zero points.

