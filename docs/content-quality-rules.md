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

- 6 single-choice questions.
- 1 multiple-choice question.
- 1 true-false question.
- 1 short-answer or fill-blank question.
- 1 matching, ordering, or assertion-reason question.

Starter content uses only auto-scored types. Long-answer, subjective, AI-graded, and file-upload answers are not seeded.

## Supported Question Types

- Single-choice: one correct option.
- Multiple-choice: exact set match; no partial credit in v1.
- True-false: fixed True / False choices.
- Short-answer: normalized exact match against accepted answers.
- Numeric: exact number with tolerance; units are display-only in v1.
- Fill-blank: all blanks must match accepted answers.
- Matching: all pairs must match exactly.
- Ordering: all items must be in exact order.
- Assertion-reason: scored as a single-choice question.
- Passage: per-question context, not nested child sections in v1.

Creators can use up to 8 options on option-based questions. Admins can use up to 10.

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
