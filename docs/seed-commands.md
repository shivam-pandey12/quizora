# Seed Commands

## Dry Run

```bash
npm run seed:content:dry
```

Validates starter content counts, slugs, quiz/question links, options, correct answers, explanations, timers, and point totals. It does not require Firebase Admin credentials and does not write Firestore.

## Safe Import

```bash
npm run seed:content
```

Writes starter-managed documents through Firebase Admin SDK. Existing unchanged starter docs are skipped. Existing non-starter docs with the same slug are preserved.

## Force Import

```bash
npm run seed:content:force
```

Updates matching slugs even when the current document was not starter-managed. Use only after exporting or reviewing the target content.

## Collections Written

- `categories`
- `quizzes`
- `questions`
- `dailyChallenges`
- `siteSettings`
- `badgeDefinitions`
- `plans`

The seed never writes user, payment, entitlement, order, attempt, room, or leaderboard collections.

## Recommended Sequence

```bash
npm run typecheck
npm run lint
npm run build
npm run seed:content:dry
```

Then verify Firebase project, credentials, and Firestore edition before:

```bash
npm run seed:content
```
