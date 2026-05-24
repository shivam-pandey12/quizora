# Firebase Deploy

Quizora uses `firebase.json` for Firestore deployment:

- database: `(default)`
- documented location: `asia-south2`
- rules: `firestore.rules`
- indexes: `firestore.indexes.json`

Quizora is also prepared for Firebase App Hosting:

- backendId: `quizora`
- app root: `/`
- runtime config: `apphosting.yaml`

## Before Deploy

```bash
firebase login
firebase use quizora-5725f
```

Verify the actual live Firestore edition and database state with Firebase CLI before go-live:

```bash
npx -y firebase-tools@latest firestore:databases:list --project quizora-5725f
npx -y firebase-tools@latest firestore:databases:get "(default)" --project quizora-5725f
```

## Deploy Rules And Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Or deploy both:

```bash
firebase deploy --only firestore
```

## Deploy The Next.js App

Recommended production path:

1. Push the repo to GitHub using `docs/github-upload.md`.
2. Create or connect a Firebase App Hosting backend for this repository.
3. Set production environment variables and secrets from `docs/env-production.md`.
4. Deploy from App Hosting or connect GitHub push-to-deploy.

Direct CLI App Hosting deploy can also use the repo's `apphosting` block:

```bash
npx -y firebase-tools@latest deploy --project quizora-5725f
```

Only run this after production secrets are configured in Firebase App Hosting or Secret Manager.

## Auth Checklist

- Enable Email/Password if normal registration is used.
- Enable Google only if production login should support it.
- Add `localhost` for dev and the production domain to Firebase Auth authorized domains.
- Register the first admin, then set `users/{uid}.role = "admin"` in Firestore from the Firebase Console or a trusted Admin SDK script.
- Long term: move admin authority to custom claims.

## Missing Index Workflow

If Firestore says a query requires an index, open the console link, compare it with `firestore.indexes.json`, add only the exact missing query shape, deploy indexes, then wait for the index build to finish.
