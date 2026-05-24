# Phase 15 Launch Prep

Phase 15 is Quizora's launch-readiness pass. It does not add gameplay, classroom, billing, or scoring features. It verifies that the current Phase 1-14 surface can be deployed, monitored, rolled back, and smoke-tested safely.

## What Changed

- Added `npm run launch:audit` for local, no-secret readiness checks.
- Documented production env variables, Firebase deploy steps, Razorpay live readiness, SEO launch checks, rollback, monitoring, and launch smoke tests.
- Preserved current Next.js App Router, Firebase Web SDK, Firebase Admin SDK, Razorpay Orders, trusted scoring, classroom, admin, and SEO behavior.

## Required Local Gates

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run launch:audit
```

Run `npm run start` after `npm run build` when the local environment can keep a production server running.

## Go-Live Gates

- Production env values are set on the hosting platform.
- Firebase Auth production domain is authorized.
- Firestore rules and indexes are deployed.
- Razorpay webhook endpoint is public and configured.
- `/sitemap.xml` and `/robots.txt` return production URLs.
- `/privacy`, `/terms`, `/refund`, `/contact`, and `/pricing` have owner/legal review.
- Admin account and support path are confirmed.

## Not Included

No prize tournaments, cash rewards, wallets, payouts, Socket.IO rewrite, email automation, analytics SDK installation, or new monetization model is included in Phase 15.

