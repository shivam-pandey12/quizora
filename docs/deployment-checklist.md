# Deployment Checklist

## Local Verification

```bash
npm install
npm audit --omit=dev
npm run typecheck
npm run lint
npm run build
npm run launch:audit
```

Equivalent one-command check:

```bash
npm run deploy:check
```

Do not run `npm audit fix --force` without reviewing the dependency plan; it can introduce breaking downgrades.

After a successful build, run `npm run start` when the environment can keep a production server running.

## GitHub Upload

- Review `docs/github-upload.md`.
- Confirm `.env.local`, `.env`, service-account JSON, Firebase private keys, Razorpay secrets, `.next`, and `node_modules` are not tracked.
- Run `git status --short` before the first commit.
- If this folder is not already a Git repo:

```bash
git init
git branch -M main
git add .
git commit -m "Prepare Quizora for production deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Production Environment

- Set every required value from `docs/env-production.md`.
- Use `NEXT_PUBLIC_APP_URL=https://your-production-domain.com`.
- Keep Razorpay, Firebase Admin, and attempt-session secrets server-only.
- Confirm live/test Razorpay keys are not mixed.
- Confirm Firebase Admin credentials work for billing and trusted scoring route handlers.
- If Firebase Storage is not enabled, keep `NEXT_PUBLIC_IMAGE_UPLOADS_ENABLED=false` and use public image URLs. Set `FIREBASE_STORAGE_BUCKET` only before enabling file uploads.

## Firebase

Quizora is prepared for Firebase App Hosting through `firebase.json` and `apphosting.yaml`. Use App Hosting for the Next.js app, and deploy Firestore rules/indexes explicitly.

```bash
firebase login
firebase use quizora-5725f
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

Before go-live, verify the actual Firestore database and edition:

```bash
npx -y firebase-tools@latest firestore:databases:list --project quizora-5725f
npx -y firebase-tools@latest firestore:databases:get "(default)" --project quizora-5725f
```

## Auth

- Email/password provider enabled if registration is public.
- Google provider enabled only if offered in production.
- Production domain added to Firebase Auth authorized domains.
- First admin account verified.
- Non-admin access denial tested.

## Razorpay

- Test checkout works before live keys.
- Webhook endpoint configured at `/api/billing/razorpay-webhook`.
- Events enabled: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`.
- Entitlements activate once and duplicate webhooks do not extend twice.
- Refund and legal pages reviewed before live payments.

## SEO And Legal

- `/robots.txt` and `/sitemap.xml` return production URLs.
- Private routes remain noindex and absent from sitemap.
- `/privacy`, `/terms`, `/refund`, `/contact`, and `/pricing` are linked and reviewed.
- Submit sitemap in Search Console after deploy.

## Final Smoke

Use `docs/launch-smoke-test.md` for public, auth, quiz, trusted scoring, rooms, matchmaking, classroom, billing, admin, security, and mobile checks.

## Rollback

Keep the previous known-good app release and Firestore rules available. See `docs/rollback-plan.md`.
