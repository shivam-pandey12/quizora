# Phase 14 Security Limitations

Quizora is safer after Phase 14, but it is not a full proctored or prize-grade competition system.

## Still Casual

- Firestore remains the live-room transport.
- There is no distributed rate limiter yet.
- There is no webcam/device proctoring.
- There are no automatic bans.
- Old client-scored attempts remain as legacy history.
- Assignment and room scoring are server-scored, but classroom/business rules still need deeper backend enforcement for large deployments.

## Future Phase Work

- Dedicated backend or Cloud Functions for all competitive writes.
- Attempt session replay detection with durable rate limits.
- Full leaderboard rebuild jobs from trusted attempts.
- Stronger room server authority for real-time timing windows.
- Admin incident workflow and support tooling.

