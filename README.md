# Quizora

Quizora is a clean-room Next.js App Router and Firebase quiz platform with public quizzes, trusted scoring, live rooms, classrooms, creator tools, Razorpay billing foundations, admin operations, and starter content seeding.

## Local Setup

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run launch:audit
```

Or run the full deployment check:

```bash
npm run deploy:check
```

For local development:

```bash
npm run dev
```

For a production smoke test after building:

```bash
npm run start
```

## Environment

Copy `.env.example` to `.env.local` for local development and fill only your own values. Never commit `.env.local`, service-account JSON, Razorpay secrets, Firebase private keys, or webhook secrets.

Production environment requirements are documented in [docs/env-production.md](docs/env-production.md).

## Firebase

This repo includes:

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`
- `apphosting.yaml`

Deploy Firestore rules and indexes explicitly:

```bash
firebase login
firebase use quizora-5725f
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

The Next.js app is prepared for Firebase App Hosting. Configure production runtime secrets in Firebase App Hosting or Secret Manager rather than committing them.

## Starter Content

Seed premium starter content only after Firebase Admin credentials are configured:

```bash
npm run seed:content:dry
npm run seed:content
```

The seed pack creates categories, quizzes, questions, daily challenges, badges, plans, and site settings. It does not create fake users, payments, entitlements, attempts, rooms, or leaderboard rows.

## Production Launch

Use these docs before launch:

- [Deployment checklist](docs/deployment-checklist.md)
- [GitHub upload guide](docs/github-upload.md)
- [Firebase deploy guide](docs/firebase-deploy.md)
- [Razorpay live checklist](docs/razorpay-live-checklist.md)
- [SEO launch checklist](docs/seo-launch-checklist.md)
- [Launch smoke test](docs/launch-smoke-test.md)
- [Rollback plan](docs/rollback-plan.md)

## GitHub Safety

Before pushing:

```bash
npm run typecheck
npm run lint
npm run build
npm run launch:audit
git status --short
```

If any secret was ever placed in a committed or shared file, rotate that key in the provider console before going live.
