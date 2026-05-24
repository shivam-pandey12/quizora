# Firebase Setup For Quizora

Quizora uses the Firebase Web SDK for browser auth/Firestore reads and Firebase Admin SDK for trusted billing and scoring route handlers. The app must build safely when config is missing, but real quiz data, auth, rooms, attempts, leaderboards, billing, and trusted scoring require these values.

## Required Environment

Create `.env.local` from `.env.example` and set:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` is optional for local development, but should be set to the deployed origin for share links and challenge links.

Do not put service account JSON or Admin SDK secrets in client-visible `NEXT_PUBLIC_*` variables.

## Billing And Admin SDK Environment

Phase 13 billing API routes also need server-only values:

```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BILLING_CURRENCY=INR
BILLING_TEST_MODE=true
BILLING_SUPPORT_EMAIL=
SUPPORT_EMAIL=
```

For local API-route token verification, configure Firebase Admin SDK using application default credentials or one of these server-only options:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_BASE64=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Trusted scoring also needs:

```bash
ATTEMPT_SESSION_SECRET=
TRUSTED_SCORING_ENABLED=true
NEXT_PUBLIC_TRUSTED_SCORING_ENABLED=true
COMPETITIVE_MODE_ENABLED=true
```

Never expose `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ATTEMPT_SESSION_SECRET`, or service-account values to browser code.

## Firebase Console Checklist

- Create or select project `quizora-5725f`.
- Use Firestore database `(default)` in `asia-south2`.
- Enable Firebase Authentication.
- Enable Email/Password sign-in.
- Enable Google sign-in if Google login is used.
- Add localhost and production domains to Auth authorized domains.
- Enable Firestore Database.
- Keep Storage available for future uploads if needed.
- Verify the actual Firestore edition before go-live:

```bash
npx -y firebase-tools@latest firestore:databases:list --project quizora-5725f
npx -y firebase-tools@latest firestore:databases:get "(default)" --project quizora-5725f
```

## Admin Bootstrap

The current app uses the `users/{uid}.role` field for admin UI and Firestore rule checks.

1. Register or sign in normally.
2. Open Firestore Console.
3. Find `users/{uid}` for the first admin account.
4. Set `role` to `admin`.
5. Refresh `/admin`.

For stronger production authority, move admin status to Firebase custom claims and validate sensitive admin mutations through trusted server code or Cloud Functions.

## Local Checks

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Run `npm run dev` after environment values are present.

## Rules And Index Deployment

Review the files before deploying:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

To deploy both together:

```bash
firebase deploy --only firestore
```

## Missing Index Error Workflow

If Firestore shows "The query requires an index":

1. Open the generated Firebase Console link.
2. Confirm the collection, fields, order directions, and query scope.
3. Add the exact index to `firestore.indexes.json` if it is not already present.
4. Deploy indexes with `firebase deploy --only firestore:indexes`.
5. Wait until the index finishes building before retesting.

## Security Notes

- Public quiz detail pages do not render correct answers.
- New solo and assignment play use trusted route handlers and safe question payloads.
- Trusted leaderboard writes are server/admin-owned.
- Live rooms are incrementally server-hardened but still use Firestore for real-time UX.
- Production-grade admin authority should move to Firebase custom claims over time.
