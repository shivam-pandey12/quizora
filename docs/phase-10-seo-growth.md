# Phase 10 SEO And Public Growth

Phase 10 makes Quizora's public pages discoverable, shareable, and safer for indexing without adding gameplay systems.

## Completed Scope

- Root metadata now uses the production app URL, title template, default OpenGraph, Twitter card metadata, and canonical defaults.
- Public pages get stronger titles, descriptions, canonicals, OpenGraph metadata, and lightweight structured data.
- Quiz and category detail routes use dynamic metadata from public-safe Firestore documents only.
- Sitemap and robots are generated through Next.js App Router conventions.
- Protected and user-specific pages remain noindex through page metadata and robots disallow rules.
- Result and live-room share text now prefers public quiz links instead of private result URLs.
- Admin quiz forms show non-blocking SEO quality notes for thin metadata and missing thumbnails.

## Indexable Public Routes

- `/`
- `/quizzes`
- `/quizzes/[slug]` for published public quizzes only
- `/categories`
- `/categories/[slug]` for active categories only
- `/leaderboard`
- `/rooms`
- `/privacy`
- `/terms`
- `/contact`

## Noindex Routes

Auth, dashboard, profile, quiz play, private results, admin, room lobby/play/result/history/create/join, challenge links, quick match setup, and matchmaking status pages remain noindex.

## Known SEO Limits

- Dynamic per-quiz OG images are not generated yet; quiz thumbnails or the default Quizora image are used.
- Sitemap dynamic entries depend on Firestore availability and public rules.
- Search indexing is not instant; submit `/sitemap.xml` through Google Search Console after deployment.

## Recommended Phase 11

Phase 11 can focus on admin power tools: content quality dashboards, most-played quizzes, low-accuracy question reports, reports/feedback workflow, import/export, and data cleanup tools.
