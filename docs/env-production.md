# Production Environment

Set production values in the hosting platform, not in committed files. Never expose server secrets with a `NEXT_PUBLIC_` prefix.

For Firebase App Hosting, configure public build variables and server runtime secrets in Firebase App Hosting/Secret Manager. Do not place production values in `apphosting.yaml`, `.env.example`, or tracked files.

## Client-Safe

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_IMAGE_UPLOADS_ENABLED=false
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_TRUSTED_SCORING_ENABLED=true
```

## Server-Only

Use one Firebase Admin credential style:

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_BASE64=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Billing and trusted scoring:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BILLING_CURRENCY=INR
BILLING_TEST_MODE=false
BILLING_SUPPORT_EMAIL=
SUPPORT_EMAIL=
ATTEMPT_SESSION_SECRET=
TRUSTED_SCORING_ENABLED=true
COMPETITIVE_MODE_ENABLED=true
```

## Checks

- `NEXT_PUBLIC_APP_URL` must be the exact production origin.
- Test keys must not be mixed with live Razorpay keys.
- `ATTEMPT_SESSION_SECRET` should be a random 32+ character string.
- Service account JSON/private keys must never be committed or printed in logs.
- Keep `NEXT_PUBLIC_IMAGE_UPLOADS_ENABLED=false` unless Firebase Storage is enabled for the project. With it disabled, Quizora uses public image URLs instead of file uploads.
- `FIREBASE_STORAGE_BUCKET` should match `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` only when API-route image uploads are enabled.
- If a Firebase service-account private key was ever placed in a shared or committed file, revoke that key in Google Cloud IAM and create a new one before launch.
- Run `npm run launch:audit`; warnings about missing local production env are acceptable on developer machines.
