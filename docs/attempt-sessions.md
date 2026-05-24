# Attempt Sessions

`attemptSessions` are server-created documents that bind a user, quiz, mode, question order, expiry, and signed session token metadata. They never contain correct answers.

## Fields

- `userId`, `quizId`, `quizSlug`, `quizTitle`
- `mode`: `solo`, `assignment`, or `live-room`
- optional `assignmentId`, `classId`, `roomId`
- `status`: `active`, `submitted`, `expired`, or `cancelled`
- `questionIds`, `questionOrder`, `questionCount`, `totalPoints`
- `startedAt`, `expiresAt`, optional `submittedAt`, optional `attemptId`
- `nonce`, token hash metadata, safe IP/user-agent hashes

Clients cannot create or update sessions through Firestore rules. Trusted route handlers create and submit them with Admin SDK writes.

## Expiry

Sessions expire based on the quiz time limit plus a small grace window. Expired submissions are rejected or flagged instead of being trusted blindly.

