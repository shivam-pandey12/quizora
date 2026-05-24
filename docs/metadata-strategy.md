# Metadata Strategy

## Base URL

`getBaseUrl()` reads `NEXT_PUBLIC_APP_URL` and falls back to `http://localhost:3000` so local builds and missing config states do not crash.

## Public Metadata

Public pages use:

- canonical URL
- title template `%s | Quizora`
- concise description
- OpenGraph website metadata
- Twitter summary large image
- default `/opengraph-image` fallback

## Dynamic Metadata

Quiz detail pages fetch only published public quiz metadata:

- title
- short description or full description
- category/difficulty context
- thumbnail URL if set

Category detail pages fetch only active category metadata:

- category name
- category description
- canonical URL

Unpublished/private/archived quizzes and hidden categories return noindex unavailable metadata and not-found behavior.

## Private Metadata

Protected and utility routes use noindex metadata. Robots.txt also disallows known private path families, but noindex metadata is the primary route-level indexing signal.

## OpenGraph Images

Phase 10 uses quiz thumbnails when available and a default Quizora image route otherwise. Dynamic per-result or per-challenge OG cards are deferred.
