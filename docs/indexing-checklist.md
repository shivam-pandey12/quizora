# Indexing Checklist

## Before Submission

- Deploy the production build.
- Deploy Firestore rules and indexes.
- Set `NEXT_PUBLIC_APP_URL` to the production domain.
- Open `/robots.txt` and verify the sitemap URL.
- Open `/sitemap.xml` and confirm public quiz/category URLs appear.
- Confirm private routes are absent from the sitemap.
- Confirm noindex metadata on dashboard, profile, play, result, admin, room private pages, quick match, status, and challenge routes.

## Google Search Console

- Add the production domain property.
- Verify ownership with the method chosen by the site owner or host.
- Submit `/sitemap.xml`.
- Use URL Inspection for `/`, `/quizzes`, one quiz detail, `/categories`, one category detail, `/leaderboard`, and `/rooms`.
- Check mobile usability and indexing status after crawl.

## Missing Index Or Firestore Errors

- If sitemap dynamic entries fail because Firestore is unavailable, the sitemap still returns static public URLs.
- If Firestore asks for an index, add the exact query shape to `firestore.indexes.json`, deploy indexes, and wait for the index to build.

## Expectations

Search engines decide crawl timing. Submission and valid metadata improve readiness, but do not guarantee immediate indexing.
