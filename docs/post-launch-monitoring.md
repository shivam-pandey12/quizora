# Post-Launch Monitoring

## First 24-72 Hours

Watch:

- App uptime and production logs.
- Firebase read/write usage and Firestore permission errors.
- Missing index errors.
- Auth registration/login errors.
- Trusted scoring API errors.
- Room answer/finalization errors.
- Razorpay order, verification, and webhook errors.
- Failed payments and entitlement activation issues.
- Reports, feedback, suspicious attempts, and active rooms.
- SEO crawl/indexing status.

## Suggested Event Map

- `signup_started`
- `signup_completed`
- `login_completed`
- `quiz_viewed`
- `quiz_started`
- `quiz_completed`
- `attempt_submit_error`
- `trusted_scoring_error`
- `result_shared`
- `leaderboard_viewed`
- `room_created`
- `room_joined`
- `room_completed`
- `room_answer_error`
- `quick_match_started`
- `quick_match_matched`
- `class_joined`
- `assignment_started`
- `assignment_submitted`
- `pricing_viewed`
- `checkout_started`
- `payment_success`
- `payment_failed`
- `webhook_error`
- `entitlement_activation_error`
- `admin_action_error`

No analytics SDK is installed in Phase 15. Keep future analytics privacy-friendly and avoid answer snapshots, payment details, private classroom data, or secrets in event payloads.

