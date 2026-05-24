# Firebase Admin Setup

Phase 14 trusted scoring and Phase 13 billing API routes require Firebase Admin SDK server credentials.

## Environment

Production hosts can use application default credentials. Local development can use one of:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Trusted scoring also needs:

```bash
ATTEMPT_SESSION_SECRET=
TRUSTED_SCORING_ENABLED=true
NEXT_PUBLIC_TRUSTED_SCORING_ENABLED=true
```

Use a random 32+ character `ATTEMPT_SESSION_SECRET`. Never prefix service account or session secret values with `NEXT_PUBLIC_`.

## Missing Config Behavior

The app should still build without server credentials. Trusted endpoints return setup errors until server credentials and the attempt session secret are present.

