# Import Export Format

## Exports

- Quizzes export as JSON.
- Categories export as JSON.
- Questions export as JSON grouped by quiz.
- Attempts export as a bounded summary CSV.
- Reports and feedback export as JSON.

Exports are client-generated from bounded admin queries.

## Imports

Phase 11 imports are intentionally conservative:

- Category imports are created hidden.
- Quiz imports are created as drafts.
- Imported questions are created hidden.
- Existing published content is not overwritten automatically.

Large imports or production migrations should use reviewed scripts or trusted backend tooling.

## Starter Content Pack

The production starter content system is separate from the browser import form. Use:

```bash
npm run seed:content:dry
npm run seed:content
```

The seed uses Firebase Admin SDK, validates the full pack before writing, and imports published starter categories, quizzes, questions, daily challenge config, badge definitions, plan catalog docs, and site settings.

It does not create users, attempts, payments, entitlements, rooms, leaderboard rows, or fake activity.
