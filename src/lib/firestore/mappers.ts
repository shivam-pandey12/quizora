import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { toIso } from "@/lib/firestore/timestamps";
import { normalizeBadges } from "@/lib/quiz/gamification";
import {
  normalizeBlanks,
  normalizeMatchPairs,
  normalizeOptions,
  normalizeOrderItems,
  normalizeQuestionType
} from "@/lib/quiz/question-engine";
import type {
  Attempt,
  Assignment,
  AssignmentSubmission,
  BotDifficulty,
  Challenge,
  Category,
  ClassInvite,
  ClassMember,
  ClassroomClass,
  ClassLeaderboardRow,
  CreatorRequest,
  FlashAnswer,
  FlashPlayer,
  FlashQuestion,
  FlashQuiz,
  FlashQuizSettings,
  FlashReport,
  FlashResult,
  LeaderboardEntry,
  MatchmakingPlayerCount,
  MatchmakingQueueEntry,
  Question,
  Quiz,
  Room,
  RoomAnalytics,
  RoomAntiAbuse,
  RoomAnswer,
  RoomPlayer,
  RoomQuestionStat,
  RoomResult,
  RoomSettings,
  SecurityFlag
} from "@/types/domain";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asSecurityFlags(value: unknown): SecurityFlag[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const data = asRecord(item);
        const severity =
          data.severity === "high" || data.severity === "medium" ? data.severity : "low";
        return {
          code: asString(data.code),
          severity,
          message: asString(data.message),
          createdAt: toIso(data.createdAt),
          metadata: asRecord(data.metadata) as Record<string, string | number | boolean | null>
        };
      })
    : [];
}

function asScoringSource(value: unknown) {
  return value === "server" ? "server" : "client";
}

function asReviewStatus(value: unknown) {
  return value === "flagged" || value === "reviewed" || value === "cleared" || value === "hidden"
    ? value
    : "none";
}

function flashQuestionTypesSafe(value: unknown) {
  const type = normalizeQuestionType(value);
  return type === "multiple-choice" || type === "true-false" || type === "short-answer" || type === "text"
    ? type
    : "single-choice";
}

function asBotDifficulty(value: unknown): BotDifficulty | null {
  return value === "easy" || value === "medium" || value === "hard" ? value : null;
}

function asPreferredPlayerCount(value: unknown): MatchmakingPlayerCount {
  return value === 2 || value === 3 || value === 4 || value === "flexible" ? value : 2;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asOptions(value: unknown) {
  return normalizeOptions(value, 0);
}

type FirestoreSnapshot = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>;

export function mapCategory(snapshot: FirestoreSnapshot): Category {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: asString(data.name),
    slug: asString(data.slug),
    description: asString(data.description),
    icon: asString(data.icon, "Sparkles"),
    accent: asString(data.accent, "bg-primary/12 text-primary"),
    quizCount: asNumber(data.quizCount),
    featured: asBoolean(data.featured),
    status: data.status === "hidden" ? "hidden" : "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapQuiz(snapshot: FirestoreSnapshot): Quiz {
  const data = snapshot.data() ?? {};
  const difficulty =
    data.difficulty === "easy" ||
    data.difficulty === "medium" ||
    data.difficulty === "hard" ||
    data.difficulty === "expert"
      ? data.difficulty
      : "easy";
  const status =
    data.status === "published" || data.status === "archived" ? data.status : "draft";
  const visibility = data.visibility === "private" ? "private" : "public";
  const ownerType = data.ownerType === "creator" ? "creator" : "admin";
  const publishScope =
    data.publishScope === "class-only" || data.publishScope === "private"
      ? data.publishScope
      : "global";
  const reviewStatus =
    data.reviewStatus === "submitted" ||
    data.reviewStatus === "approved" ||
    data.reviewStatus === "rejected"
      ? data.reviewStatus
      : ownerType === "admin" && status === "published"
        ? "approved"
        : "draft";

  return {
    id: snapshot.id,
    title: asString(data.title),
    slug: asString(data.slug),
    description: asString(data.description),
    shortDescription: asString(data.shortDescription),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    difficulty,
    status,
    visibility,
    thumbnailUrl: asString(data.thumbnailUrl),
    coverImageUrl: asString(data.coverImageUrl),
    coverImagePath: asString(data.coverImagePath),
    coverImageAlt: asString(data.coverImageAlt),
    coverImageCaption: asString(data.coverImageCaption),
    tags: asStringArray(data.tags),
    estimatedMinutes: asNumber(data.estimatedMinutes, 5),
    questionCount: asNumber(data.questionCount),
    totalPoints: asNumber(data.totalPoints),
    timeLimitSeconds: asNumber(data.timeLimitSeconds),
    isFeatured: asBoolean(data.isFeatured),
    isDailyChallenge: asBoolean(data.isDailyChallenge),
    playCount: asNumber(data.playCount),
    averageScore: asNumber(data.averageScore),
    createdBy: asString(data.createdBy),
    updatedBy: asString(data.updatedBy),
    ownerId: asString(data.ownerId, asString(data.createdBy)),
    ownerName: asString(data.ownerName, "Quizora Studio"),
    ownerEmail: asString(data.ownerEmail),
    ownerType,
    publishScope,
    reviewStatus,
    rejectionNote: asString(data.rejectionNote),
    submittedAt: toIso(data.submittedAt),
    reviewedAt: toIso(data.reviewedAt),
    reviewedBy: asString(data.reviewedBy),
    reviewedByName: asString(data.reviewedByName),
    approvedAt: toIso(data.approvedAt),
    approvedBy: asString(data.approvedBy),
    creatorEditable: asBoolean(data.creatorEditable, true),
    allowedClassIds: asStringArray(data.allowedClassIds),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    publishedAt: toIso(data.publishedAt)
  };
}

export function mapCreatorRequest(snapshot: FirestoreSnapshot): CreatorRequest {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "approved" || data.status === "rejected" ? data.status : "pending";

  return {
    id: snapshot.id,
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora learner"),
    email: asString(data.email),
    photoURL: asString(data.photoURL) || null,
    reason: asString(data.reason),
    interests: asString(data.interests),
    experience: asString(data.experience),
    intendedUse: asString(data.intendedUse),
    agreementAccepted: asBoolean(data.agreementAccepted),
    status,
    adminNote: asString(data.adminNote),
    reviewedBy: asString(data.reviewedBy),
    reviewedByName: asString(data.reviewedByName),
    reviewedAt: toIso(data.reviewedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapQuestion(snapshot: FirestoreSnapshot): Question {
  const data = snapshot.data() ?? {};
  const type = normalizeQuestionType(data.type);

  return {
    id: snapshot.id,
    quizId: asString(data.quizId),
    type,
    questionText: asString(data.questionText),
    options: asOptions(data.options),
    correctAnswer: asString(data.correctAnswer),
    correctAnswers: asStringArray(data.correctAnswers),
    correctOptionId: asString(data.correctOptionId, asString(data.correctAnswer)),
    correctOptionIds: asStringArray(data.correctOptionIds).length
      ? asStringArray(data.correctOptionIds)
      : asStringArray(data.correctAnswers),
    correctText: asString(data.correctText, type === "short-answer" || type === "text" ? asString(data.correctAnswer) : ""),
    acceptableAnswers: asStringArray(data.acceptableAnswers),
    caseSensitive: asBoolean(data.caseSensitive),
    trimWhitespace: asBoolean(data.trimWhitespace, true),
    correctNumber: typeof data.correctNumber === "number" ? data.correctNumber : null,
    tolerance: typeof data.tolerance === "number" ? data.tolerance : 0,
    unit: asString(data.unit),
    allowEquivalentUnits: asBoolean(data.allowEquivalentUnits),
    blanks: normalizeBlanks(data.blanks),
    blankScoring: "all-or-nothing",
    matchPairs: normalizeMatchPairs(data.matchPairs),
    shuffleRight: asBoolean(data.shuffleRight, true),
    orderItems: normalizeOrderItems(data.orderItems),
    correctOrderIds: asStringArray(data.correctOrderIds),
    assertionText: asString(data.assertionText),
    reasonText: asString(data.reasonText),
    passageTitle: asString(data.passageTitle),
    passageText: asString(data.passageText),
    passageImageUrl: asString(data.passageImageUrl),
    passageImageAlt: asString(data.passageImageAlt),
    explanation: asString(data.explanation),
    imageUrl: asString(data.imageUrl),
    imagePath: asString(data.imagePath),
    imageAlt: asString(data.imageAlt),
    imageCaption: asString(data.imageCaption),
    points: asNumber(data.points, 10),
    timeLimitSeconds: asNumber(data.timeLimitSeconds),
    order: asNumber(data.order),
    status: data.status === "hidden" ? "hidden" : "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapAttempt(snapshot: FirestoreSnapshot): Attempt {
  const data = snapshot.data() ?? {};
  const rawAnswers = Array.isArray(data.answers) ? data.answers : [];
  const difficulty =
    data.difficulty === "easy" ||
    data.difficulty === "medium" ||
    data.difficulty === "hard" ||
    data.difficulty === "expert"
      ? data.difficulty
      : "easy";

  return {
    id: snapshot.id,
    mode:
      data.mode === "live-room" || data.mode === "assignment"
        ? data.mode
        : "solo",
    roomId: asString(data.roomId) || null,
    roomCode: asString(data.roomCode) || null,
    classId: asString(data.classId) || null,
    className: asString(data.className) || null,
    assignmentId: asString(data.assignmentId) || null,
    assignmentTitle: asString(data.assignmentTitle) || null,
    userId: asString(data.userId),
    userDisplayName: asString(data.userDisplayName, "Quizora Player"),
    userPhotoURL: asString(data.userPhotoURL) || null,
    quizId: asString(data.quizId),
    quizSlug: asString(data.quizSlug),
    quizTitle: asString(data.quizTitle, "Untitled quiz"),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    difficulty,
    status: data.status === "abandoned" ? "abandoned" : "completed",
    score: asNumber(data.score),
    totalPoints: asNumber(data.totalPoints),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    totalQuestions: asNumber(data.totalQuestions),
    accuracy: asNumber(data.accuracy),
    timeTakenSeconds: asNumber(data.timeTakenSeconds),
    startedAt: toIso(data.startedAt),
    completedAt: toIso(data.completedAt),
    answers: rawAnswers.map((answer) => ({
      questionId: asString(answer?.questionId),
      questionTextSnapshot: asString(answer?.questionTextSnapshot),
      type: normalizeQuestionType(answer?.type),
      selectedAnswer: asString(answer?.selectedAnswer),
      selectedAnswers: asStringArray(answer?.selectedAnswers),
      correctAnswer: asString(answer?.correctAnswer),
      correctAnswers: asStringArray(answer?.correctAnswers),
      selectedAnswerSummary: asString(answer?.selectedAnswerSummary),
      correctAnswerSummary: asString(answer?.correctAnswerSummary),
      textAnswer: asString(answer?.textAnswer),
      numericAnswer: asString(answer?.numericAnswer),
      blankAnswers: asRecord(answer?.blankAnswers) as Record<string, string>,
      correctBlankAnswers: asRecord(answer?.correctBlankAnswers) as Record<string, string[]>,
      matchingAnswers: asRecord(answer?.matchingAnswers) as Record<string, string>,
      correctMatchingAnswers: asRecord(answer?.correctMatchingAnswers) as Record<string, string>,
      orderingAnswerIds: asStringArray(answer?.orderingAnswerIds),
      correctOrderIds: asStringArray(answer?.correctOrderIds),
      skipped: asBoolean(answer?.skipped),
      isCorrect: asBoolean(answer?.isCorrect),
      pointsEarned: asNumber(answer?.pointsEarned),
      pointsPossible: asNumber(answer?.pointsPossible),
      timeSpentSeconds: asNumber(answer?.timeSpentSeconds),
      explanationSnapshot: asString(answer?.explanationSnapshot),
      questionImageUrl: asString(answer?.questionImageUrl),
      questionImageAlt: asString(answer?.questionImageAlt),
      questionImageCaption: asString(answer?.questionImageCaption),
      optionsSnapshot: Array.isArray(answer?.optionsSnapshot)
        ? asOptions(answer.optionsSnapshot)
        : []
      ,
      blanksSnapshot: normalizeBlanks(answer?.blanksSnapshot),
      matchPairsSnapshot: normalizeMatchPairs(answer?.matchPairsSnapshot),
      orderItemsSnapshot: normalizeOrderItems(answer?.orderItemsSnapshot),
      unit: asString(answer?.unit),
      tolerance: typeof answer?.tolerance === "number" ? answer.tolerance : null,
      passageTitle: asString(answer?.passageTitle),
      passageText: asString(answer?.passageText),
      assertionText: asString(answer?.assertionText),
      reasonText: asString(answer?.reasonText)
    })),
    xpEarned: asNumber(data.xpEarned),
    levelBefore: asNumber(data.levelBefore, 1),
    levelAfter: asNumber(data.levelAfter, 1),
    streakAfter: asNumber(data.streakAfter),
    badgeUnlocks: normalizeBadges(data.badgeUnlocks),
    personalBestStatus:
      data.personalBestStatus === "new-best" ||
      data.personalBestStatus === "matched" ||
      data.personalBestStatus === "below-best"
        ? data.personalBestStatus
        : "first",
    personalBestDelta: asNumber(data.personalBestDelta),
    leaderboardUpdated: asBoolean(data.leaderboardUpdated),
    scoringSource: asScoringSource(data.scoringSource),
    trusted: asBoolean(data.trusted),
    attemptSessionId: asString(data.attemptSessionId) || null,
    securityFlags: asSecurityFlags(data.securityFlags),
    suspiciousScore: asNumber(data.suspiciousScore),
    reviewStatus: asReviewStatus(data.reviewStatus),
    hiddenFromLeaderboard: asBoolean(data.hiddenFromLeaderboard),
    serverScoredAt: toIso(data.serverScoredAt),
    clientReportedTime:
      typeof data.clientReportedTime === "number" ? data.clientReportedTime : null,
    serverCalculatedTime: asNumber(data.serverCalculatedTime, asNumber(data.timeTakenSeconds)),
    timingDrift: asNumber(data.timingDrift),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapRoomSettings(value: unknown): RoomSettings {
  const data = (value ?? {}) as Record<string, unknown>;
  const scoringMode = data.scoringMode === "speed-bonus" ? "speed-bonus" : "standard";
  const visibility = data.visibility === "public" ? "public" : "private";

  return {
    questionTimerSeconds: asNumber(data.questionTimerSeconds, 30),
    showCorrectAfterEachQuestion: asBoolean(data.showCorrectAfterEachQuestion),
    allowLateJoin: asBoolean(data.allowLateJoin),
    requireReady: asBoolean(data.requireReady),
    shuffleQuestions: asBoolean(data.shuffleQuestions),
    shuffleOptions: asBoolean(data.shuffleOptions),
    autoAdvance: asBoolean(data.autoAdvance),
    autoAdvanceDelaySeconds: asNumber(data.autoAdvanceDelaySeconds, 5),
    scoringMode,
    visibility,
    maxPlayers: asNumber(data.maxPlayers, 12)
  };
}

function mapRoomQuestionStats(value: unknown): RoomQuestionStat[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const data = asRecord(item);
        return {
          questionId: asString(data.questionId),
          questionIndex: asNumber(data.questionIndex),
          correctCount: asNumber(data.correctCount),
          wrongCount: asNumber(data.wrongCount),
          skippedCount: asNumber(data.skippedCount),
          averageTimeSeconds: asNumber(data.averageTimeSeconds)
        };
      })
    : [];
}

function mapRoomAnalytics(value: unknown): RoomAnalytics {
  const data = asRecord(value);

  return {
    totalJoined: asNumber(data.totalJoined),
    peakPlayers: asNumber(data.peakPlayers),
    startedPlayerCount: asNumber(data.startedPlayerCount),
    completedPlayerCount: asNumber(data.completedPlayerCount),
    averageScore: asNumber(data.averageScore),
    averageAccuracy: asNumber(data.averageAccuracy),
    averageTimePerQuestion: asNumber(data.averageTimePerQuestion),
    abandonCount: asNumber(data.abandonCount),
    durationSeconds: asNumber(data.durationSeconds),
    questionStats: mapRoomQuestionStats(data.questionStats)
  };
}

function mapRoomAntiAbuse(value: unknown): RoomAntiAbuse {
  const data = asRecord(value);

  return {
    duplicateSubmissionBlocked: asBoolean(data.duplicateSubmissionBlocked, true),
    clientScored: asBoolean(data.clientScored, true),
    duplicateAnswerAttempts: asNumber(data.duplicateAnswerAttempts),
    fastAdvanceCount: asNumber(data.fastAdvanceCount),
    answerAfterEndCount: asNumber(data.answerAfterEndCount),
    joinLeaveCount: asNumber(data.joinLeaveCount),
    flags: asStringArray(data.flags)
  };
}

export function mapRoom(snapshot: FirestoreSnapshot): Room {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "starting" ||
    data.status === "in-progress" ||
    data.status === "question-review" ||
    data.status === "completed" ||
    data.status === "cancelled"
      ? data.status
      : "waiting";
  const visibility = data.visibility === "public" ? "public" : "private";
  const difficulty =
    data.difficulty === "medium" ||
    data.difficulty === "hard" ||
    data.difficulty === "expert"
      ? data.difficulty
      : "easy";

  return {
    id: snapshot.id,
    roomCode: asString(data.roomCode),
    source:
      data.source === "quick-match" || data.source === "challenge" || data.source === "class-room"
        ? data.source
        : "manual",
    roomTitle: asString(data.roomTitle),
    roomDescription: asString(data.roomDescription),
    quizId: asString(data.quizId),
    quizSlug: asString(data.quizSlug),
    quizTitle: asString(data.quizTitle, "Untitled quiz"),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    difficulty,
    hostId: asString(data.hostId),
    hostName: asString(data.hostName, "Host"),
    hostPhotoURL: asString(data.hostPhotoURL) || null,
    status,
    visibility,
    maxPlayers: asNumber(data.maxPlayers, 12),
    playerCount: asNumber(data.playerCount),
    currentQuestionIndex: asNumber(data.currentQuestionIndex),
    totalQuestions: asNumber(data.totalQuestions),
    totalPoints: asNumber(data.totalPoints),
    questionOrder: asStringArray(data.questionOrder),
    questionStartedAt: toIso(data.questionStartedAt),
    questionEndsAt: toIso(data.questionEndsAt),
    startedAt: toIso(data.startedAt),
    completedAt: toIso(data.completedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    locked: asBoolean(data.locked),
    rematchRoomId: asString(data.rematchRoomId) || null,
    matchmakingEnabled: asBoolean(data.matchmakingEnabled),
    preferredPlayerCount: asNumber(data.preferredPlayerCount, asNumber(data.maxPlayers, 12)),
    minPlayersToStart: asNumber(data.minPlayersToStart, 1),
    allowBotFill: asBoolean(data.allowBotFill),
    botFillAt: toIso(data.botFillAt),
    botFillDelaySeconds: asNumber(data.botFillDelaySeconds, 30),
    botFillUsed: asBoolean(data.botFillUsed),
    matchmakingStatus:
      data.matchmakingStatus === "filling" ||
      data.matchmakingStatus === "ready" ||
      data.matchmakingStatus === "started" ||
      data.matchmakingStatus === "closed"
        ? data.matchmakingStatus
        : "open",
    queueCreatedBy: asString(data.queueCreatedBy),
    challengeId: asString(data.challengeId) || null,
    classId: asString(data.classId) || null,
    className: asString(data.className) || null,
    allowedMemberOnly: asBoolean(data.allowedMemberOnly),
    settings: mapRoomSettings(data.settings),
    analytics: mapRoomAnalytics(data.analytics),
    antiAbuse: mapRoomAntiAbuse(data.antiAbuse),
    leaderboardMode: data.leaderboardMode === "trusted" ? "trusted" : "casual"
  };
}

function mapClassroomStats(value: unknown) {
  const data = asRecord(value);
  return {
    completedAssignments: asNumber(data.completedAssignments),
    averageAccuracy: asNumber(data.averageAccuracy),
    totalScore: asNumber(data.totalScore),
    bestRank: asNumber(data.bestRank),
    liveRoomsPlayed: asNumber(data.liveRoomsPlayed)
  };
}

export function mapClassroomClass(snapshot: FirestoreSnapshot): ClassroomClass {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: asString(data.name, "Untitled class"),
    slug: asString(data.slug),
    description: asString(data.description),
    subject: asString(data.subject, "General"),
    gradeLevel: asString(data.gradeLevel),
    coverAccent: asString(data.coverAccent, "from-amber-200 via-stone-100 to-sky-100"),
    ownerId: asString(data.ownerId),
    ownerName: asString(data.ownerName, "Teacher"),
    organizationName: asString(data.organizationName),
    status: data.status === "archived" ? "archived" : "active",
    visibility: data.visibility === "private" ? "private" : "invite-only",
    inviteCode: asString(data.inviteCode),
    memberCount: asNumber(data.memberCount),
    assignmentCount: asNumber(data.assignmentCount),
    roomCount: asNumber(data.roomCount),
    averageAccuracy: asNumber(data.averageAccuracy),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    archivedAt: toIso(data.archivedAt)
  };
}

export function mapClassMember(snapshot: FirestoreSnapshot): ClassMember {
  const data = snapshot.data() ?? {};
  const role =
    data.role === "teacher" || data.role === "assistant" ? data.role : "student";
  const status =
    data.status === "removed" || data.status === "pending" ? data.status : "active";
  return {
    id: snapshot.id,
    classId: asString(data.classId),
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Student"),
    email: asString(data.email),
    photoURL: asString(data.photoURL) || null,
    role,
    status,
    joinedAt: toIso(data.joinedAt),
    lastActiveAt: toIso(data.lastActiveAt),
    stats: mapClassroomStats(data.stats)
  };
}

export function mapClassInvite(snapshot: FirestoreSnapshot): ClassInvite {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "disabled" || data.status === "expired" ? data.status : "active";
  return {
    id: snapshot.id,
    classId: asString(data.classId),
    inviteCode: asString(data.inviteCode),
    createdBy: asString(data.createdBy),
    status,
    expiresAt: toIso(data.expiresAt),
    maxUses: asNumber(data.maxUses),
    usedCount: asNumber(data.usedCount),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapAssignment(snapshot: FirestoreSnapshot): Assignment {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "published" || data.status === "closed" ? data.status : "draft";
  return {
    id: snapshot.id,
    classId: asString(data.classId),
    className: asString(data.className, "Class"),
    quizId: asString(data.quizId),
    quizSlug: asString(data.quizSlug),
    quizTitle: asString(data.quizTitle, "Untitled quiz"),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    title: asString(data.title, "Untitled assignment"),
    instructions: asString(data.instructions),
    dueAt: toIso(data.dueAt),
    status,
    allowLateSubmission: asBoolean(data.allowLateSubmission),
    attemptLimit: asNumber(data.attemptLimit, 1),
    showResultsImmediately: asBoolean(data.showResultsImmediately, true),
    createdBy: asString(data.createdBy),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    publishedAt: toIso(data.publishedAt)
  };
}

export function mapAssignmentSubmission(snapshot: FirestoreSnapshot): AssignmentSubmission {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "in-progress" ||
    data.status === "submitted" ||
    data.status === "late" ||
    data.status === "missing"
      ? data.status
      : "not-started";
  return {
    id: snapshot.id,
    assignmentId: asString(data.assignmentId),
    classId: asString(data.classId),
    quizId: asString(data.quizId),
    userId: asString(data.userId),
    userDisplayName: asString(data.userDisplayName, "Quizora Student"),
    attemptId: asString(data.attemptId) || null,
    status,
    score: asNumber(data.score),
    totalPoints: asNumber(data.totalPoints),
    accuracy: asNumber(data.accuracy),
    timeTakenSeconds: asNumber(data.timeTakenSeconds),
    submittedAt: toIso(data.submittedAt),
    dueAt: toIso(data.dueAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapClassLeaderboardRow(
  member: ClassMember,
  rank: number
): ClassLeaderboardRow {
  return {
    userId: member.userId,
    displayName: member.displayName,
    photoURL: member.photoURL,
    rank,
    completedAssignments: member.stats.completedAssignments,
    totalScore: member.stats.totalScore,
    averageAccuracy: member.stats.averageAccuracy
  };
}

export function mapRoomPlayer(snapshot: FirestoreSnapshot): RoomPlayer {
  const data = snapshot.data() ?? {};
  const role = data.role === "host" ? "host" : "player";
  const status =
    data.status === "ready" ||
    data.status === "playing" ||
    data.status === "submitted" ||
    data.status === "left" ||
    data.status === "disconnected"
      ? data.status
      : "joined";
  const currentAnswerStatus =
    data.currentAnswerStatus === "submitted" ||
    data.currentAnswerStatus === "skipped" ||
    data.currentAnswerStatus === "correct" ||
    data.currentAnswerStatus === "wrong"
      ? data.currentAnswerStatus
      : "idle";

  return {
    id: snapshot.id,
    roomId: asString(data.roomId),
    roomCode: asString(data.roomCode),
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Player"),
    photoURL: asString(data.photoURL) || null,
    role,
    isBot: asBoolean(data.isBot),
    botId: asString(data.botId) || null,
    botDifficulty: asBotDifficulty(data.botDifficulty),
    botPersonality: asString(data.botPersonality),
    status,
    score: asNumber(data.score),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    currentAnswerStatus,
    joinedAt: toIso(data.joinedAt),
    lastSeenAt: toIso(data.lastSeenAt),
    completedAt: toIso(data.completedAt)
  };
}

export function mapRoomAnswer(snapshot: FirestoreSnapshot): RoomAnswer {
  const data = snapshot.data() ?? {};
  const type = normalizeQuestionType(data.type);

  return {
    id: snapshot.id,
    roomId: asString(data.roomId),
    roomCode: asString(data.roomCode),
    userId: asString(data.userId),
    isBot: asBoolean(data.isBot),
    questionId: asString(data.questionId),
    questionIndex: asNumber(data.questionIndex),
    questionTextSnapshot: asString(data.questionTextSnapshot),
    type,
    selectedAnswer: asString(data.selectedAnswer),
    selectedAnswers: asStringArray(data.selectedAnswers),
    correctAnswer: asString(data.correctAnswer),
    correctAnswers: asStringArray(data.correctAnswers),
    selectedAnswerSummary: asString(data.selectedAnswerSummary),
    correctAnswerSummary: asString(data.correctAnswerSummary),
    textAnswer: asString(data.textAnswer),
    numericAnswer: asString(data.numericAnswer),
    blankAnswers: asRecord(data.blankAnswers) as Record<string, string>,
    correctBlankAnswers: asRecord(data.correctBlankAnswers) as Record<string, string[]>,
    matchingAnswers: asRecord(data.matchingAnswers) as Record<string, string>,
    correctMatchingAnswers: asRecord(data.correctMatchingAnswers) as Record<string, string>,
    orderingAnswerIds: asStringArray(data.orderingAnswerIds),
    correctOrderIds: asStringArray(data.correctOrderIds),
    skipped: asBoolean(data.skipped),
    isCorrect: asBoolean(data.isCorrect),
    pointsEarned: asNumber(data.pointsEarned),
    pointsPossible: asNumber(data.pointsPossible),
    timeTakenSeconds: asNumber(data.timeTakenSeconds),
    explanationSnapshot: asString(data.explanationSnapshot),
    questionImageUrl: asString(data.questionImageUrl),
    questionImageAlt: asString(data.questionImageAlt),
    questionImageCaption: asString(data.questionImageCaption),
    optionsSnapshot: asOptions(data.optionsSnapshot),
    blanksSnapshot: normalizeBlanks(data.blanksSnapshot),
    matchPairsSnapshot: normalizeMatchPairs(data.matchPairsSnapshot),
    orderItemsSnapshot: normalizeOrderItems(data.orderItemsSnapshot),
    unit: asString(data.unit),
    tolerance: typeof data.tolerance === "number" ? data.tolerance : null,
    passageTitle: asString(data.passageTitle),
    passageText: asString(data.passageText),
    assertionText: asString(data.assertionText),
    reasonText: asString(data.reasonText),
    trusted: asBoolean(data.trusted),
    scoringSource: asScoringSource(data.scoringSource),
    securityFlags: asSecurityFlags(data.securityFlags),
    answeredAt: toIso(data.answeredAt)
  };
}

export function mapRoomResult(snapshot: FirestoreSnapshot): RoomResult {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    roomId: asString(data.roomId),
    roomCode: asString(data.roomCode),
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Player"),
    photoURL: asString(data.photoURL) || null,
    isBot: asBoolean(data.isBot),
    botDifficulty: asBotDifficulty(data.botDifficulty),
    score: asNumber(data.score),
    totalPoints: asNumber(data.totalPoints),
    accuracy: asNumber(data.accuracy),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    rank: asNumber(data.rank),
    xpEarned: asNumber(data.xpEarned),
    attemptId: asString(data.attemptId) || null,
    trusted: asBoolean(data.trusted),
    scoringSource: asScoringSource(data.scoringSource),
    securityFlags: asSecurityFlags(data.securityFlags),
    reviewStatus: asReviewStatus(data.reviewStatus),
    completedAt: toIso(data.completedAt)
  };
}

function mapFlashSettings(value: unknown): FlashQuizSettings {
  const data = asRecord(value);
  return {
    shuffleQuestions: asBoolean(data.shuffleQuestions),
    shuffleOptions: asBoolean(data.shuffleOptions),
    showCorrectAfterEachQuestion: asBoolean(data.showCorrectAfterEachQuestion),
    allowLateJoin: asBoolean(data.allowLateJoin, true),
    autoAdvance: asBoolean(data.autoAdvance),
    requireLogin: asBoolean(data.requireLogin, true),
    allowRetake: asBoolean(data.allowRetake),
    maxAttemptsPerPlayer: Math.max(1, asNumber(data.maxAttemptsPerPlayer, 1)),
    showLeaderboardDuringPlay: asBoolean(data.showLeaderboardDuringPlay, true),
    showLeaderboardAfterFinish: asBoolean(data.showLeaderboardAfterFinish, true)
  };
}

export function mapFlashQuiz(snapshot: FirestoreSnapshot): FlashQuiz {
  const data = snapshot.data() ?? {};
  const mode = data.mode === "self-paced" ? "self-paced" : "live";
  const status =
    data.status === "draft" ||
    data.status === "running" ||
    data.status === "ended" ||
    data.status === "expired" ||
    data.status === "archived"
      ? data.status
      : "active";
  const antiAbuse = asRecord(data.antiAbuse);

  return {
    id: snapshot.id,
    flashCode: asString(data.flashCode),
    title: asString(data.title, "Untitled Flash Quiz"),
    description: asString(data.description),
    hostId: asString(data.hostId),
    hostName: asString(data.hostName, "Quizora Host"),
    hostPhotoURL: asString(data.hostPhotoURL) || null,
    mode,
    status,
    visibility: "link-only",
    expiryHours: asNumber(data.expiryHours, 1),
    expiresAt: toIso(data.expiresAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    startedAt: toIso(data.startedAt),
    endedAt: toIso(data.endedAt),
    currentQuestionIndex: asNumber(data.currentQuestionIndex),
    questionStartedAt: toIso(data.questionStartedAt),
    questionEndsAt: toIso(data.questionEndsAt),
    questionCount: asNumber(data.questionCount),
    totalPoints: asNumber(data.totalPoints),
    maxPlayers: asNumber(data.maxPlayers, 10),
    playerCount: asNumber(data.playerCount),
    allowGuests: asBoolean(data.allowGuests),
    showAnswersAfterEach: asBoolean(data.showAnswersAfterEach),
    leaderboardMode: data.leaderboardMode === "score-speed" ? "score-speed" : "score",
    questionTimerSeconds: asNumber(data.questionTimerSeconds, 30),
    lockAfterStart: asBoolean(data.lockAfterStart, true),
    isPremiumExtended: asBoolean(data.isPremiumExtended),
    extensionCount: asNumber(data.extensionCount),
    source: "flash",
    convertedQuizId: asString(data.convertedQuizId) || null,
    antiAbuse: {
      duplicateAnswerAttempts: asNumber(antiAbuse.duplicateAnswerAttempts),
      failedJoinAttempts: asNumber(antiAbuse.failedJoinAttempts),
      reportCount: asNumber(antiAbuse.reportCount),
      flags: asStringArray(antiAbuse.flags)
    },
    settings: mapFlashSettings(data.settings)
  };
}

export function mapFlashQuestion(snapshot: FirestoreSnapshot): FlashQuestion {
  const data = snapshot.data() ?? {};
  const type = flashQuestionTypesSafe(data.type);
  return {
    id: snapshot.id,
    flashQuizId: asString(data.flashQuizId),
    questionText: asString(data.questionText),
    type,
    options: asOptions(data.options).filter((option) => option.id && option.text),
    correctAnswer: asString(data.correctAnswer),
    correctAnswers: asStringArray(data.correctAnswers),
    correctOptionId: asString(data.correctOptionId, asString(data.correctAnswer)),
    correctOptionIds: asStringArray(data.correctOptionIds).length
      ? asStringArray(data.correctOptionIds)
      : asStringArray(data.correctAnswers),
    correctText: asString(data.correctText, type === "short-answer" || type === "text" ? asString(data.correctAnswer) : ""),
    acceptableAnswers: asStringArray(data.acceptableAnswers),
    caseSensitive: asBoolean(data.caseSensitive),
    trimWhitespace: asBoolean(data.trimWhitespace, true),
    explanation: asString(data.explanation),
    imageUrl: asString(data.imageUrl),
    imagePath: asString(data.imagePath),
    imageAlt: asString(data.imageAlt),
    imageCaption: asString(data.imageCaption),
    points: asNumber(data.points, 1),
    timeLimitSeconds: asNumber(data.timeLimitSeconds, 30),
    order: asNumber(data.order),
    status: data.status === "hidden" ? "hidden" : "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function mapFlashPlayer(snapshot: FirestoreSnapshot): FlashPlayer {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "ready" ||
    data.status === "playing" ||
    data.status === "submitted" ||
    data.status === "completed" ||
    data.status === "left" ||
    data.status === "disconnected"
      ? data.status
      : "joined";
  return {
    id: snapshot.id,
    flashQuizId: asString(data.flashQuizId),
    flashCode: asString(data.flashCode),
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Player"),
    photoURL: asString(data.photoURL) || null,
    role: data.role === "host" ? "host" : "player",
    isGuest: asBoolean(data.isGuest),
    status,
    score: asNumber(data.score),
    accuracy: asNumber(data.accuracy),
    rank: asNumber(data.rank),
    previousRank: asNumber(data.previousRank),
    rankDelta: asNumber(data.rankDelta),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    totalTimeSeconds: asNumber(data.totalTimeSeconds),
    joinedAt: toIso(data.joinedAt),
    lastActiveAt: toIso(data.lastActiveAt),
    completedAt: toIso(data.completedAt)
  };
}

export function mapFlashAnswer(snapshot: FirestoreSnapshot): FlashAnswer {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    flashQuizId: asString(data.flashQuizId),
    flashCode: asString(data.flashCode),
    playerId: asString(data.playerId),
    userId: asString(data.userId),
    questionId: asString(data.questionId),
    questionIndex: asNumber(data.questionIndex),
    selectedAnswer: asString(data.selectedAnswer),
    selectedAnswers: asStringArray(data.selectedAnswers),
    textAnswer: asString(data.textAnswer),
    isCorrect: asBoolean(data.isCorrect),
    pointsEarned: asNumber(data.pointsEarned),
    pointsPossible: asNumber(data.pointsPossible),
    timeTakenSeconds: asNumber(data.timeTakenSeconds),
    answeredAt: toIso(data.answeredAt),
    createdAt: toIso(data.createdAt)
  };
}

export function mapFlashResult(snapshot: FirestoreSnapshot): FlashResult {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    flashQuizId: asString(data.flashQuizId),
    flashCode: asString(data.flashCode),
    playerId: asString(data.playerId),
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Player"),
    photoURL: asString(data.photoURL) || null,
    score: asNumber(data.score),
    totalPoints: asNumber(data.totalPoints),
    accuracy: asNumber(data.accuracy),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    rank: asNumber(data.rank),
    previousRank: asNumber(data.previousRank),
    totalTimeSeconds: asNumber(data.totalTimeSeconds),
    completedAt: toIso(data.completedAt),
    createdAt: toIso(data.createdAt)
  };
}

export function mapFlashReport(snapshot: FirestoreSnapshot): FlashReport {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "reviewing" || data.status === "resolved" || data.status === "dismissed"
      ? data.status
      : "open";
  return {
    id: snapshot.id,
    flashQuizId: asString(data.flashQuizId),
    flashCode: asString(data.flashCode),
    reportedBy: asString(data.reportedBy),
    reason: asString(data.reason),
    details: asString(data.details),
    status,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    reviewedBy: asString(data.reviewedBy),
    adminNote: asString(data.adminNote)
  };
}

export function mapMatchmakingQueueEntry(snapshot: FirestoreSnapshot): MatchmakingQueueEntry {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "matched" || data.status === "cancelled" || data.status === "expired"
      ? data.status
      : "searching";
  const difficulty =
    data.preferredDifficulty === "easy" ||
    data.preferredDifficulty === "medium" ||
    data.preferredDifficulty === "hard" ||
    data.preferredDifficulty === "expert"
      ? data.preferredDifficulty
      : "any";
  const antiAbuse = asRecord(data.antiAbuse);

  return {
    id: snapshot.id,
    userId: asString(data.userId),
    displayName: asString(data.displayName, "Quizora Player"),
    photoURL: asString(data.photoURL) || null,
    status,
    preferredQuizId: asString(data.preferredQuizId),
    preferredCategoryId: asString(data.preferredCategoryId),
    preferredDifficulty: difficulty,
    preferredPlayerCount: asPreferredPlayerCount(data.preferredPlayerCount),
    allowBotFill: asBoolean(data.allowBotFill, true),
    questionTimerSeconds: asNumber(data.questionTimerSeconds, 30),
    scoringMode: data.scoringMode === "speed-bonus" ? "speed-bonus" : "standard",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    expiresAt: toIso(data.expiresAt),
    matchedRoomId: asString(data.matchedRoomId) || null,
    matchedRoomCode: asString(data.matchedRoomCode) || null,
    region: asString(data.region, "global"),
    ratingBand: asString(data.ratingBand, "casual"),
    antiAbuse: {
      cancelCount: asNumber(antiAbuse.cancelCount),
      retryCount: asNumber(antiAbuse.retryCount),
      flags: asStringArray(antiAbuse.flags)
    }
  };
}

export function mapChallenge(snapshot: FirestoreSnapshot): Challenge {
  const data = snapshot.data() ?? {};
  const status =
    data.status === "joined" || data.status === "expired" || data.status === "cancelled"
      ? data.status
      : "active";

  return {
    id: snapshot.id,
    createdBy: asString(data.createdBy),
    createdByName: asString(data.createdByName, "Quizora Player"),
    quizId: asString(data.quizId),
    quizTitle: asString(data.quizTitle, "Untitled quiz"),
    roomId: asString(data.roomId),
    roomCode: asString(data.roomCode),
    status,
    expiresAt: toIso(data.expiresAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    acceptedBy: asString(data.acceptedBy) || null
  };
}

export function mapLeaderboardEntry(snapshot: FirestoreSnapshot): LeaderboardEntry {
  const data = snapshot.data() ?? {};
  const scope =
    data.scope === "quiz" || data.scope === "category" ? data.scope : "global";
  const periodType =
    data.periodType === "daily" ||
    data.periodType === "weekly" ||
    data.periodType === "monthly"
      ? data.periodType
      : "all-time";
  const difficulty =
    data.difficulty === "easy" ||
    data.difficulty === "medium" ||
    data.difficulty === "hard" ||
    data.difficulty === "expert"
      ? data.difficulty
      : "easy";

  return {
    id: snapshot.id,
    scope,
    scopeId: asString(data.scopeId, "all"),
    userId: asString(data.userId),
    userDisplayName: asString(data.userDisplayName, "Quizora Player"),
    userPhotoURL: asString(data.userPhotoURL) || null,
    quizId: asString(data.quizId),
    quizSlug: asString(data.quizSlug),
    quizTitle: asString(data.quizTitle),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName),
    difficulty,
    score: asNumber(data.score),
    totalPoints: asNumber(data.totalPoints),
    accuracy: asNumber(data.accuracy),
    timeTakenSeconds: asNumber(data.timeTakenSeconds),
    correctCount: asNumber(data.correctCount),
    wrongCount: asNumber(data.wrongCount),
    skippedCount: asNumber(data.skippedCount),
    attemptId: asString(data.attemptId),
    periodType,
    periodKey: asString(data.periodKey, "all"),
    rankScore: asNumber(data.rankScore),
    aggregateAttempts: asNumber(data.aggregateAttempts, 1),
    hidden: asBoolean(data.hidden),
    hiddenReason: asString(data.hiddenReason),
    suspicious: asBoolean(data.suspicious),
    reviewed: asBoolean(data.reviewed),
    trusted: asBoolean(data.trusted),
    sourceAttemptId: asString(data.sourceAttemptId, asString(data.attemptId)),
    scoringSource: asScoringSource(data.scoringSource),
    updatedBy: data.updatedBy === "server" || data.updatedBy === "admin" ? data.updatedBy : "client",
    botEntry: asBoolean(data.botEntry, asString(data.userId).startsWith("bot_")),
    reviewStatus: asReviewStatus(data.reviewStatus),
    moderatedBy: asString(data.moderatedBy) || null,
    moderatedAt: toIso(data.moderatedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    completedAt: toIso(data.completedAt)
  };
}
