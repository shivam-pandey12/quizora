# SEO Checklist

## Metadata

- Set `NEXT_PUBLIC_APP_URL` to the production origin.
- Confirm root title is `Quizora — Play, Compete, and Master Quizzes`.
- Confirm public pages have unique titles and descriptions.
- Confirm private pages use noindex metadata.
- Confirm quiz detail metadata only loads published public quiz data.
- Confirm category detail metadata only loads active category data.

## OpenGraph And Sharing

- Check home, quizzes, quiz detail, categories, leaderboard, and rooms in an OG preview tool.
- Confirm quiz detail uses `thumbnailUrl` when set.
- Confirm fallback image is `/opengraph-image`.
- Confirm result sharing points to public quiz links, not private attempt data.
- Confirm room/challenge invite links do not expose answer details.

## Structured Data

- Validate `WebSite`, `SoftwareApplication`, `CollectionPage`, `BreadcrumbList`, and quiz/category `WebPage` JSON-LD.
- Do not add fake ratings, fake reviews, correct answers, or private user data.

## Content Quality

- Quiz titles should be clear and under typical search-preview truncation length.
- `shortDescription` should be useful, concise, and visible.
- Full descriptions should explain scope, skill signal, and audience.
- Category descriptions should be human-readable, not keyword-stuffed.
- Public pages should have clear H1/H2 hierarchy.
