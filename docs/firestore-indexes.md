# Firestore Indexes

`firestore.indexes.json` is the deployable source of truth for composite indexes. Single-field equality and simple single-field order queries are handled by Firestore automatically.

Deploy with:

```bash
firebase deploy --only firestore:indexes
```

Before launch, also verify the live database and edition with Firebase CLI:

```bash
npx -y firebase-tools@latest firestore:databases:list --project quizora-5725f
npx -y firebase-tools@latest firestore:databases:get "(default)" --project quizora-5725f
```

## Verified Query Families

### Quizzes

- `status + visibility + publishedAt desc`
- `status + visibility + isFeatured desc + publishedAt desc`
- `status + visibility + categoryId + publishedAt desc`
- `status + visibility + difficulty + publishedAt desc`
- `categoryId + status`
- `status + categoryId + updatedAt desc`
- `isFeatured + status + updatedAt desc`
- `isDailyChallenge + status + updatedAt desc`

### Categories

- `status + featured desc + name asc`

### Questions

- `quizId + order asc`
- `quizId + status + order asc`

Phase 14 trusted play fetches questions through server route handlers and returns safe question data without correct answers.

### Attempts

- `userId + completedAt desc`
- `userId + quizId + status + completedAt desc`
- `userId + quizId + completedAt desc`
- `quizId + completedAt desc`
- `categoryId + completedAt desc`
- `userId + mode + completedAt desc`
- `mode + completedAt desc`
- `userId + trusted + completedAt desc`
- `scoringSource + completedAt desc`
- `reviewStatus + completedAt desc`
- `hiddenFromLeaderboard + completedAt desc`
- `suspiciousScore desc + completedAt desc`

### Attempt Sessions

- `userId + status + startedAt desc`
- `userId + quizId + startedAt desc`

### Leaderboards

- `scope + scopeId + periodType + periodKey + hidden + rankScore desc + completedAt asc`
- `scope + scopeId + periodType + periodKey + trusted + hidden + botEntry + rankScore desc + completedAt asc`
- `userId + scope + scopeId + periodType + periodKey`
- `quizId + periodType + periodKey + rankScore desc`
- `categoryId + periodType + periodKey + rankScore desc`
- `trusted + hidden + rankScore desc`
- `quizId + trusted + hidden + rankScore desc`
- `categoryId + trusted + hidden + rankScore desc`
- `hidden + suspicious + createdAt desc`

### Rooms

- `visibility + status + createdAt desc`
- `source + status + createdAt desc`
- `source + visibility + status + createdAt asc`
- `source + visibility + status + createdAt desc`
- `source + matchmakingStatus + createdAt desc`
- `visibility + status + source + playerCount`
- `visibility + status + playerCount`
- `status + createdAt desc`
- `hostId + createdAt desc`
- `quizId + createdAt desc`
- `status + completedAt desc`
- `source + createdAt desc`

Room code lookup uses `where("roomCode", "==", code)` and uses Firestore single-field indexing.

### Room Players, Answers, Results

- `roomPlayers: roomId + score desc`
- `roomPlayers: roomId + joinedAt asc`
- `roomPlayers: userId + joinedAt desc`
- `roomPlayers: roomId + isBot + joinedAt asc`
- `roomAnswers: roomId + questionIndex`
- `roomAnswers: roomId + questionIndex + userId`
- `roomAnswers: roomId + userId + questionIndex`
- `roomResults: roomId + rank asc`
- `roomResults: userId + completedAt desc`
- `roomResults: trusted + completedAt desc`

### Matchmaking And Challenges

- `matchmakingQueue: userId + status + createdAt desc`
- `matchmakingQueue: status + preferredQuizId + createdAt asc`
- `matchmakingQueue: status + preferredCategoryId + createdAt asc`
- `matchmakingQueue: status + expiresAt asc`
- `matchmakingQueue: status + createdAt desc`
- `challenges: status + expiresAt`
- `challenges: createdBy + createdAt desc`

### Admin Operations

- `reports: status + createdAt desc`
- `reports: type + status + createdAt desc`
- `reports: targetId + createdAt desc`
- `feedback: status + createdAt desc`
- `feedback: type + status + createdAt desc`
- `adminLogs: adminId + createdAt desc`
- `adminLogs: targetType + targetId + createdAt desc`
- `dailyChallenges: status + dateKey`

Single-field queries such as `adminLogs.createdAt desc` and `dailyChallenges.dateKey` rely on Firestore automatic single-field indexes.

### Billing

- `entitlements: userId + status + expiresAt desc`
- `entitlements: planId + status + expiresAt desc`
- `entitlements: source + createdAt desc`
- `billingOrders: userId + createdAt desc`
- `billingOrders: status + createdAt desc`
- `payments: userId + createdAt desc`
- `payments: status + createdAt desc`
- `payments: planId + createdAt desc`
- `webhookEvents: eventType + receivedAt desc`
- `webhookEvents: processed + receivedAt desc`
- `refunds: status + createdAt desc`
- `refunds: userId + createdAt desc`
- `billingAuditLogs: userId + createdAt desc`
- `usageCounters: userId + periodKey`

Razorpay order id and payment id lookups are single-field equality queries and rely on automatic single-field indexes.

## Missing Index Policy

Add only exact indexes required by deployed query shapes. Do not remove existing working indexes during feature phases unless the code path has been deleted and the index is confirmed unused.

Index deployment can take time. If production still shows the missing-index error immediately after deploy, wait for the index build to complete in Firebase Console before changing code.
