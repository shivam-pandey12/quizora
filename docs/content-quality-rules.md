# Content Quality Rules

Quizora starter content is designed to feel useful and trustworthy, not like filler.

## Rules

- Write original evergreen questions.
- Avoid copied exam, book, website, coaching, or current-affairs questions.
- Avoid adult, unsafe, political attack, gambling, prize, or payment content.
- Keep facts simple, stable, and student-safe.
- Use clear wording with one correct answer.
- Include plausible options and a short explanation.
- Avoid fake play counts, fake users, fake payments, fake entitlements, and fake revenue.

## Question Structure

Each starter quiz has 10 active questions:

- 8 single-choice questions.
- 1 multiple-choice question.
- 1 true-false question.

No text-answer questions are included in v1 because trusted scoring should remain predictable for starter content.

## Difficulty Defaults

- Easy: 1 point, 25 seconds.
- Medium: 2 points, 40 seconds.
- Hard: 3 points, 55 seconds.
- Expert: 4 points, 75 seconds.

Quiz totals are derived from active questions by the seed pack.

## Editing Starter Content

Edit `scripts/starter-content/pack.mjs`, then run:

```bash
npm run seed:content:dry
```

Only run the real seed after the dry run passes and the target Firebase project is confirmed.
