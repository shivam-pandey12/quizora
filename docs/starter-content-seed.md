# Starter Content Seed

Quizora includes an explicit starter-content seed for production launch preparation. It publishes original educational quizzes and supporting catalog data so the public app does not feel empty on day one.

## What It Seeds

- 16 active public categories.
- 48 published public quizzes.
- 480 original questions with answer explanations.
- 6 featured quizzes and 6 featured categories.
- A hero quiz and active daily challenge schedule.
- 24 badge definition documents.
- Free, Plus, Creator, and Classroom plan catalog documents.
- Public-safe `siteSettings/app` and `siteSettings/homepage` documents.

The seed does **not** create users, payments, entitlements, orders, rooms, attempts, leaderboard rows, fake activity, or fake revenue.

## Commands

```bash
npm run seed:content:dry
npm run seed:content
npm run seed:content:force
```

Use dry run first. It validates the pack and prints the expected counts without connecting to Firestore.

## Idempotency

The seed uses stable slugs and starter document IDs. Each managed document includes:

- `seedPackId`
- `seedVersion`
- `seedContentHash`

If the stored hash matches the current pack, the document is skipped. Existing non-starter content with the same slug is preserved unless `seed:content:force` is used.

## Firebase Admin Env

The real seed command needs one Firebase Admin credential style:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_BASE64=
```

or:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

`SUPPORT_EMAIL` or `BILLING_SUPPORT_EMAIL` may be set to fill the public support email in site settings.

Do not commit service account secrets. Do not run the real seed against production until Firestore rules/indexes and the target project are verified.

## Firestore Edition Note

Before production seeding, verify the live Firestore database and edition with Firebase CLI:

```bash
npx -y firebase-tools@latest firestore:databases:list --project quizora-5725f
npx -y firebase-tools@latest firestore:databases:get "(default)" --project quizora-5725f
```

Local planning observed `firebase.json` targeting `(default)` in `asia-south2`, but live project state must still be checked before go-live.
