# GitHub Upload Guide

Use this when publishing Quizora to a new GitHub repository.

## 1. Safety Check

Run the local checks first:

```bash
npm run typecheck
npm run lint
npm run build
npm run launch:audit
```

Or:

```bash
npm run deploy:check
```

Confirm secrets are not in tracked files:

```bash
git status --short
git diff -- .env.example .gitignore firebase.json apphosting.yaml package.json
```

Do not commit:

- `.env.local`
- `.env`
- Firebase service-account JSON files
- Firebase private keys
- Razorpay key secrets
- Razorpay webhook secrets
- Firebase debug logs
- `.next`
- `node_modules`

If a real private key was ever committed or shared, revoke it and create a new key before pushing.

## 2. Initialize Git

If this folder is not already a Git repo:

```bash
git init
git branch -M main
```

## 3. First Commit

```bash
git add .
git commit -m "Prepare Quizora for production deployment"
```

## 4. Create GitHub Repo

Create an empty private or public repository on GitHub. Do not add a README/license from GitHub if you are pushing this existing repo.

Then connect it:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 5. GitHub CI

The repository includes `.github/workflows/ci.yml`.

It runs:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run launch:audit`

CI does not deploy production automatically. It is a verification gate.

## 6. Hosting After Push

Recommended hosting target for Quizora is Firebase App Hosting because this is a Next.js app with route handlers.

Production deployment checklist:

```bash
firebase login
firebase use quizora-5725f
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

Then configure Firebase App Hosting for the GitHub repo and set production environment values/secrets from `docs/env-production.md`.

## 7. Final Checks

After the first hosted deployment:

- Open the production homepage.
- Open `/sitemap.xml` and `/robots.txt`.
- Confirm Firebase Auth authorized domains include the production domain.
- Confirm billing checkout is disabled if Razorpay live env is not ready.
- Confirm trusted scoring endpoints return clean setup errors if server secrets are missing.
- Run the manual smoke test in `docs/launch-smoke-test.md`.
