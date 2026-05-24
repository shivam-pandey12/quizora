# Launch Smoke Test

## Public

- Home opens.
- Quizzes opens.
- Quiz detail opens.
- Categories opens.
- Category detail opens.
- Leaderboard opens.
- Rooms hub opens.
- Pricing opens.
- Privacy, terms, refund, and contact open.
- `/sitemap.xml` opens.
- `/robots.txt` opens.

## Auth

- Register creates a profile.
- Login works.
- Google login works if enabled.
- Logout works.
- Protected routes redirect or show access states correctly.

## Quiz And Trusted Scoring

- Start a published quiz.
- Confirm play UI loads via trusted start.
- Submit answers.
- Result opens.
- Result shows verified state for new server-scored attempts.
- Leaderboard updates with trusted row.
- Wrong user cannot open private result.

## Rooms And Matchmaking

- Create room.
- Join room.
- Play live room.
- Submit answer.
- Finalize room.
- Room result opens.
- Private room is not public discovery.
- Quick match starts.
- Bot fill works if enabled.
- Challenge link opens.

## Classroom

- Teacher/creator opens `/creator`.
- Teacher creates class.
- Student joins with invite code.
- Teacher assigns quiz.
- Student submits assignment.
- Teacher sees submission.

## Billing

- Pricing loads.
- Missing Razorpay env disables checkout gracefully.
- Logged-out upgrade redirects to login.
- Test checkout creates order.
- Verify payment succeeds with valid signature.
- Bad signature is rejected.
- Webhook event writes `webhookEvents`.
- Entitlement appears in `/billing`.

## Admin And Security

- Admin overview opens.
- Quizzes, users, attempts, rooms, billing, entitlements, settings, and security pages open.
- Non-admin is blocked.
- User cannot self-change role.
- User cannot write trusted attempts, leaderboards, entitlements, or payment status from client SDK.
- Sensitive admin actions require confirmation where UI supports it.

## Mobile

- Home, quiz play, result, rooms, dashboard, pricing, and admin shell are usable on mobile widths.

