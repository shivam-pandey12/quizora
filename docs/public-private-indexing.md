# Public And Private Indexing Map

## Indexable

- `/`
- `/quizzes`
- `/quizzes/[slug]` when quiz is published and public
- `/categories`
- `/categories/[slug]` when category is active
- `/leaderboard`
- `/rooms`
- `/privacy`
- `/terms`
- `/contact`

## Noindex

- `/login`
- `/register`
- `/dashboard`
- `/profile`
- `/play/[quizId]`
- `/result/[attemptId]`
- `/rooms/create`
- `/rooms/join`
- `/rooms/history`
- `/rooms/[roomCode]`
- `/rooms/[roomCode]/play`
- `/rooms/[roomCode]/result`
- `/rooms/challenge/[challengeId]`
- `/matchmaking`
- `/matchmaking/quick`
- `/matchmaking/status`
- `/admin`
- all nested admin pages

## Data Boundaries

Public pages must never fetch or render:

- correct answers
- private attempt snapshots
- user emails
- private room answer data
- matchmaking queues
- admin analytics

Quiz play still reads correct answers client-side for scoring. That is an anti-cheat limitation, not an SEO surface.
