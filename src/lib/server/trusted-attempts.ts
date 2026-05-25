import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  hashRequestValue,
  randomNonce,
  requestIp,
  requestUserAgent,
  sha256,
  signAttemptSession,
  trustedScoringEnabled,
  verifyAttemptSessionToken
} from "@/lib/server/trusted-utils";
import { calculateStreakUpdate, evaluateBadgesForAttempt, normalizeBadges } from "@/lib/quiz/gamification";
import { getPeriodKey } from "@/lib/quiz/periods";
import { scoreQuizAttempt, scoreSingleQuestion } from "@/lib/quiz/scoring";
import {
  getSafeQuestionPayload,
  normalizeBlanks,
  normalizeMatchPairs,
  normalizeOptions,
  normalizeOrderItems,
  normalizeQuestionType
} from "@/lib/quiz/question-engine";
import { calculateXPForAttempt } from "@/lib/quiz/xp";
import { isPublicApprovedQuiz } from "@/lib/quiz/public-visibility";
import type {
  Attempt,
  AttemptMode,
  PersonalBestStatus,
  PlayQuestion,
  Question,
  Quiz,
  QuizAnswerState,
  ReviewStatus,
  SecurityFlag,
  UserProfile
} from "@/types/domain";

const playableQuestionLimit = 250;
const periodTypes = ["all-time", "daily", "weekly", "monthly"] as const;

type RawData = Record<string, unknown>;

function leaderboardSafeId(value: string) {
  return encodeURIComponent(value || "all").replace(/\./g, "%2E");
}

function trustedLeaderboardEntryId({
  scope,
  scopeId,
  periodType,
  periodKey,
  userId
}: {
  scope: "global" | "quiz" | "category";
  scopeId: string;
  periodType: (typeof periodTypes)[number];
  periodKey: string;
  userId: string;
}) {
  return [scope, leaderboardSafeId(scopeId), periodType, leaderboardSafeId(periodKey), leaderboardSafeId(userId)].join("_");
}

function calculateTrustedRankScore(attempt: Pick<Attempt, "score" | "accuracy" | "timeTakenSeconds">) {
  const timeBonus = Math.max(0, 100000 - Math.max(0, attempt.timeTakenSeconds || 0));
  return Math.round((attempt.score || 0) * 100000 + (attempt.accuracy || 0) * 1000 + timeBonus);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toIso(value: unknown): string | null {
  return toDate(value)?.toISOString() ?? (typeof value === "string" ? value : null);
}

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

function mapQuizFromData(id: string, data: RawData): Quiz {
  const status = data.status === "published" || data.status === "archived" ? data.status : "draft";
  const ownerType = data.ownerType === "creator" ? "creator" : "admin";
  const reviewStatus =
    data.reviewStatus === "submitted" ||
    data.reviewStatus === "approved" ||
    data.reviewStatus === "rejected"
      ? data.reviewStatus
      : ownerType === "admin" && status === "published"
        ? "approved"
        : "draft";
  return {
    id,
    title: asString(data.title),
    slug: asString(data.slug),
    description: asString(data.description),
    shortDescription: asString(data.shortDescription),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    difficulty:
      data.difficulty === "medium" || data.difficulty === "hard" || data.difficulty === "expert"
        ? data.difficulty
        : "easy",
    status,
    visibility: data.visibility === "private" ? "private" : "public",
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
    publishScope:
      data.publishScope === "class-only" || data.publishScope === "private"
        ? data.publishScope
        : "global",
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

function mapQuestionFromData(id: string, data: RawData): Question {
  const type = normalizeQuestionType(data.type);
  return {
    id,
    quizId: asString(data.quizId),
    type,
    questionText: asString(data.questionText),
    options: normalizeOptions(data.options, 0),
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

function safeQuestion(question: Question): PlayQuestion {
  return getSafeQuestionPayload(question);
}

function profileName(decoded: DecodedIdToken, userData: RawData) {
  return (
    asString(userData.displayName) ||
    asString(decoded.name) ||
    asString(decoded.email) ||
    "Quizora Player"
  );
}

function profilePhoto(decoded: DecodedIdToken, userData: RawData) {
  return asString(userData.photoURL) || asString(decoded.picture) || null;
}

async function getQuiz(quizId: string) {
  const snapshot = await getAdminDb().collection("quizzes").doc(quizId).get();
  if (!snapshot.exists) return null;
  return mapQuizFromData(snapshot.id, snapshot.data() ?? {});
}

async function listQuestions(quizId: string) {
  const snapshot = await getAdminDb()
    .collection("questions")
    .where("quizId", "==", quizId)
    .where("status", "==", "active")
    .orderBy("order", "asc")
    .limit(playableQuestionLimit)
    .get();
  return snapshot.docs.map((docSnapshot) => mapQuestionFromData(docSnapshot.id, docSnapshot.data()));
}

async function getAssignmentContext({
  assignmentId,
  classId,
  userId
}: {
  assignmentId?: string;
  classId?: string;
  userId: string;
}) {
  if (!assignmentId) return null;
  const db = getAdminDb();
  const assignmentSnapshot = await db.collection("assignments").doc(assignmentId).get();
  if (!assignmentSnapshot.exists) throw new Error("Assignment was not found.");
  const assignment = assignmentSnapshot.data() ?? {};
  const resolvedClassId = asString(assignment.classId, classId ?? "");
  if (!resolvedClassId || (classId && resolvedClassId !== classId)) {
    throw new Error("Assignment class does not match this request.");
  }
  if (assignment.status !== "published") throw new Error("This assignment is not open.");
  const membershipSnapshot = await db.collection("classMembers").doc(`${resolvedClassId}_${userId}`).get();
  if (!membershipSnapshot.exists || membershipSnapshot.data()?.status !== "active") {
    throw new Error("Only active class members can start this assignment.");
  }
  const submissionSnapshot = await db.collection("assignmentSubmissions").doc(`${assignmentId}_${userId}`).get();
  if (submissionSnapshot.exists && asString(submissionSnapshot.data()?.attemptId)) {
    throw new Error("This assignment already has a submitted attempt.");
  }
  const dueAt = toDate(assignment.dueAt);
  const allowLate = asBoolean(assignment.allowLateSubmission);
  if (dueAt && dueAt.getTime() < Date.now() && !allowLate) {
    throw new Error("The assignment due date has passed.");
  }
  return {
    assignmentId,
    assignmentTitle: asString(assignment.title, "Class assignment"),
    classId: resolvedClassId,
    className: asString(assignment.className, "Class"),
    dueAt,
    allowLateSubmission: allowLate,
    attemptLimit: Math.max(1, asNumber(assignment.attemptLimit, 1)),
    quizId: asString(assignment.quizId),
    showResultsImmediately: asBoolean(assignment.showResultsImmediately, true)
  };
}

function quizCanPlay(quiz: Quiz, assignment: Awaited<ReturnType<typeof getAssignmentContext>>) {
  if (quiz.status !== "published") return false;
  if (!assignment) return isPublicApprovedQuiz(quiz);
  return (
    isPublicApprovedQuiz(quiz) ||
    quiz.publishScope === "class-only" ||
    quiz.allowedClassIds.includes(assignment.classId)
  );
}

function buildSecurityFlags({
  score,
  questionIds,
  submittedIds,
  serverCalculatedTime,
  clientReportedTime,
  expired,
  duplicateSubmit
}: {
  score: ReturnType<typeof scoreQuizAttempt>;
  questionIds: string[];
  submittedIds: string[];
  serverCalculatedTime: number;
  clientReportedTime: number | null;
  expired: boolean;
  duplicateSubmit: boolean;
}): SecurityFlag[] {
  const now = new Date().toISOString();
  const flags: SecurityFlag[] = [];
  const unknownIds = submittedIds.filter((id) => !questionIds.includes(id));
  if (unknownIds.length) {
    flags.push({
      code: "unknown_question_ids",
      severity: "high",
      message: "Submission contained question IDs outside the attempt session.",
      createdAt: now,
      metadata: { count: unknownIds.length }
    });
  }
  if (duplicateSubmit) {
    flags.push({
      code: "duplicate_submit",
      severity: "medium",
      message: "A repeated submission was attempted for this session.",
      createdAt: now
    });
  }
  if (expired) {
    flags.push({
      code: "expired_session_submit",
      severity: "medium",
      message: "The submission arrived after the session expiry grace window.",
      createdAt: now
    });
  }
  if (score.totalQuestions > 0 && serverCalculatedTime <= Math.max(8, score.totalQuestions * 3)) {
    flags.push({
      code: "impossible_speed",
      severity: "high",
      message: "Submission time was below the minimum expected threshold.",
      createdAt: now,
      metadata: { serverCalculatedTime }
    });
  }
  if (
    score.totalPoints > 0 &&
    score.score >= score.totalPoints &&
    serverCalculatedTime <= Math.max(20, score.totalQuestions * 6)
  ) {
    flags.push({
      code: "fast_perfect_score",
      severity: "medium",
      message: "Perfect score with unusually low completion time.",
      createdAt: now,
      metadata: { serverCalculatedTime }
    });
  }
  if (clientReportedTime !== null && Math.abs(serverCalculatedTime - clientReportedTime) > 90) {
    flags.push({
      code: "timing_drift",
      severity: "low",
      message: "Client-reported timing differed significantly from server timing.",
      createdAt: now,
      metadata: { drift: Math.abs(serverCalculatedTime - clientReportedTime) }
    });
  }
  return flags;
}

function suspiciousScore(flags: SecurityFlag[]) {
  return flags.reduce((sum, flag) => {
    if (flag.severity === "high") return sum + 60;
    if (flag.severity === "medium") return sum + 30;
    return sum + 10;
  }, 0);
}

function reviewStatusFor(score: number): ReviewStatus {
  return score >= 60 ? "flagged" : "none";
}

export async function startTrustedAttempt({
  decoded,
  quizId,
  assignmentId,
  classId,
  request
}: {
  decoded: DecodedIdToken;
  quizId: string;
  assignmentId?: string;
  classId?: string;
  request: Request;
}) {
  if (!trustedScoringEnabled) throw new Error("Trusted scoring is disabled for this environment.");
  if (!quizId) throw new Error("quizId is required.");
  const assignment = await getAssignmentContext({ assignmentId, classId, userId: decoded.uid });
  const resolvedQuizId = assignment?.quizId || quizId;
  if (assignment && resolvedQuizId !== quizId) throw new Error("Assignment quiz does not match this request.");
  const quiz = await getQuiz(resolvedQuizId);
  if (!quiz || !quizCanPlay(quiz, assignment)) throw new Error("This quiz is not available for trusted play.");
  const questions = await listQuestions(quiz.id);
  if (!questions.length) throw new Error("This quiz does not have active questions yet.");

  const db = getAdminDb();
  const sessionRef = db.collection("attemptSessions").doc();
  const now = new Date();
  const timeLimitSeconds =
    quiz.timeLimitSeconds || questions.reduce((sum, question) => sum + (question.timeLimitSeconds || 0), 0);
  const expiresAtMs = now.getTime() + Math.max(300, timeLimitSeconds || questions.length * 45) * 1000 + 60_000;
  const nonce = randomNonce();
  const safeQuestions = questions.map(safeQuestion);
  const sessionToken = signAttemptSession({
    sessionId: sessionRef.id,
    userId: decoded.uid,
    nonce,
    expiresAtMs
  });

  await sessionRef.set({
    userId: decoded.uid,
    quizId: quiz.id,
    quizSlug: quiz.slug,
    quizTitle: quiz.title,
    status: "active",
    mode: assignment ? "assignment" : "solo",
    assignmentId: assignment?.assignmentId ?? null,
    assignmentTitle: assignment?.assignmentTitle ?? null,
    classId: assignment?.classId ?? null,
    className: assignment?.className ?? null,
    assignmentDueAt: assignment?.dueAt ?? null,
    roomId: null,
    startedAt: now,
    expiresAt: new Date(expiresAtMs),
    submittedAt: null,
    attemptId: null,
    questionIds: questions.map((question) => question.id),
    questionOrder: questions.map((question) => question.id),
    safeQuestions,
    questionCount: questions.length,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0),
    timeLimitSeconds,
    nonce,
    sessionTokenHash: sha256(sessionToken),
    clientFingerprint: "",
    ipHash: hashRequestValue(requestIp(request)),
    userAgentHash: hashRequestValue(requestUserAgent(request)),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return {
    attemptSessionId: sessionRef.id,
    sessionToken,
    quiz: {
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      categoryId: quiz.categoryId,
      categoryName: quiz.categoryName,
      difficulty: quiz.difficulty,
      timeLimitSeconds,
      totalPoints: questions.reduce((sum, question) => sum + question.points, 0)
    },
    questions: safeQuestions,
    assignment: assignment
      ? {
          assignmentId: assignment.assignmentId,
          assignmentTitle: assignment.assignmentTitle,
          classId: assignment.classId,
          className: assignment.className,
          dueAt: assignment.dueAt?.toISOString() ?? null
        }
      : null
  };
}

async function getPreviousBestAttemptForQuiz(userId: string, quizId: string) {
  const snapshot = await getAdminDb()
    .collection("attempts")
    .where("userId", "==", userId)
    .where("quizId", "==", quizId)
    .where("status", "==", "completed")
    .orderBy("completedAt", "desc")
    .limit(50)
    .get();
  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        score: asNumber(data.score),
        accuracy: asNumber(data.accuracy),
        timeTakenSeconds: asNumber(data.timeTakenSeconds),
        completedAt: toIso(data.completedAt)
      };
    })
    .reduce<null | { score: number; accuracy: number; timeTakenSeconds: number; completedAt: string | null }>(
      (best, attempt) => {
        if (!best) return attempt;
        if (attempt.score !== best.score) return attempt.score > best.score ? attempt : best;
        if (attempt.accuracy !== best.accuracy) return attempt.accuracy > best.accuracy ? attempt : best;
        if (attempt.timeTakenSeconds !== best.timeTakenSeconds) {
          return attempt.timeTakenSeconds < best.timeTakenSeconds ? attempt : best;
        }
        return attempt;
      },
      null
    );
}

async function upsertTrustedLeaderboard(attempt: Attempt, scope: "global" | "quiz" | "category", scopeId: string) {
  const db = getAdminDb();
  for (const periodType of periodTypes) {
    const periodKey = getPeriodKey(periodType, attempt.completedAt ? new Date(attempt.completedAt) : new Date());
    const id = trustedLeaderboardEntryId({ scope, scopeId, periodType, periodKey, userId: attempt.userId });
    const ref = db.collection("leaderboards").doc(id);
    const existing = await ref.get();
    const existingData = existing.data() ?? {};
    const incomingRankScore = calculateTrustedRankScore(attempt);
    const existingRankScore = asNumber(existingData.rankScore, -1);
    const existingCompletedAt = toIso(existingData.completedAt);
    const shouldWrite =
      !existing.exists ||
      !asBoolean(existingData.trusted) ||
      incomingRankScore >= existingRankScore ||
      Boolean(attempt.completedAt && existingCompletedAt && attempt.completedAt < existingCompletedAt);
    if (!shouldWrite) continue;

    await ref.set(
      {
        scope,
        scopeId,
        userId: attempt.userId,
        userDisplayName: attempt.userDisplayName,
        userPhotoURL: attempt.userPhotoURL ?? null,
        quizId: attempt.quizId,
        quizSlug: attempt.quizSlug,
        quizTitle: attempt.quizTitle,
        categoryId: attempt.categoryId,
        categoryName: attempt.categoryName,
        difficulty: attempt.difficulty,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        accuracy: attempt.accuracy,
        timeTakenSeconds: attempt.timeTakenSeconds,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        skippedCount: attempt.skippedCount,
        attemptId: attempt.id,
        sourceAttemptId: attempt.id,
        periodType,
        periodKey,
        rankScore: incomingRankScore,
        aggregateAttempts: Math.max(1, asNumber(existingData.aggregateAttempts, 1)),
        hidden: asBoolean(existingData.hidden, attempt.hiddenFromLeaderboard),
        hiddenReason: asString(existingData.hiddenReason),
        suspicious: attempt.suspiciousScore >= 60,
        reviewed: asBoolean(existingData.reviewed),
        trusted: true,
        scoringSource: "server",
        updatedBy: "server",
        botEntry: false,
        reviewStatus: attempt.reviewStatus,
        completedAt: attempt.completedAt ? new Date(attempt.completedAt) : new Date(),
        createdAt: existing.exists ? existingData.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
}

export async function updateTrustedLeaderboardsForAttempt(attempt: Attempt) {
  if (attempt.hiddenFromLeaderboard || !attempt.trusted || attempt.userId.startsWith("bot_")) return;
  await Promise.all([
    upsertTrustedLeaderboard(attempt, "quiz", attempt.quizId),
    upsertTrustedLeaderboard(attempt, "category", attempt.categoryId),
    upsertTrustedLeaderboard(attempt, "global", "all")
  ]);
}

export async function submitTrustedAttempt({
  decoded,
  attemptSessionId,
  sessionToken,
  answers,
  clientStartedAtMs,
  clientCompletedAtMs
}: {
  decoded: DecodedIdToken;
  attemptSessionId: string;
  sessionToken: string;
  answers: Record<string, QuizAnswerState>;
  clientStartedAtMs?: number;
  clientCompletedAtMs?: number;
}) {
  if (!trustedScoringEnabled) throw new Error("Trusted scoring is disabled for this environment.");
  if (!attemptSessionId || !sessionToken) throw new Error("Attempt session and token are required.");
  const db = getAdminDb();
  const sessionRef = db.collection("attemptSessions").doc(attemptSessionId);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) throw new Error("Attempt session was not found.");
  const session = sessionSnapshot.data() ?? {};
  if (asString(session.userId) !== decoded.uid) throw new Error("This attempt session belongs to another user.");
  const expiresAt = toDate(session.expiresAt);
  const expiresAtMs = expiresAt?.getTime() ?? 0;
  if (
    !verifyAttemptSessionToken({
      token: sessionToken,
      sessionId: attemptSessionId,
      userId: decoded.uid,
      nonce: asString(session.nonce),
      expiresAtMs
    }) ||
    sha256(sessionToken) !== asString(session.sessionTokenHash)
  ) {
    throw new Error("Attempt session validation failed.");
  }
  if (asString(session.status) === "submitted" && asString(session.attemptId)) {
    return {
      attemptId: asString(session.attemptId),
      resultPath: asString(session.assignmentId)
        ? `/assignments/${asString(session.assignmentId)}/result?attemptId=${asString(session.attemptId)}`
        : `/result/${asString(session.attemptId)}`,
      duplicate: true
    };
  }
  if (asString(session.status) !== "active") throw new Error("This attempt session is not active.");

  const questionIds = asStringArray(session.questionIds);
  const submittedIds = Object.keys(answers ?? {});
  const unknownIds = submittedIds.filter((id) => !questionIds.includes(id));
  if (unknownIds.length) throw new Error("Submission contained answers for questions outside this session.");

  const [quiz, questions, previousBest] = await Promise.all([
    getQuiz(asString(session.quizId)),
    listQuestions(asString(session.quizId)),
    getPreviousBestAttemptForQuiz(decoded.uid, asString(session.quizId))
  ]);
  if (!quiz) throw new Error("Quiz for this attempt is missing.");
  const orderedQuestions = questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question));
  if (orderedQuestions.length !== questionIds.length) {
    throw new Error("One or more questions from this session are no longer available.");
  }

  const startedAt = toDate(session.startedAt) ?? new Date();
  const submittedAt = new Date();
  const serverCalculatedTime = Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000));
  const clientReportedTime =
    typeof clientStartedAtMs === "number" && typeof clientCompletedAtMs === "number"
      ? Math.max(0, Math.round((clientCompletedAtMs - clientStartedAtMs) / 1000))
      : null;
  const expired = Boolean(expiresAt && submittedAt.getTime() > expiresAt.getTime());
  if (expiresAt && submittedAt.getTime() > expiresAt.getTime() + 60_000) {
    await sessionRef.set(
      { status: "expired", updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    throw new Error("This attempt session expired. Start a fresh attempt.");
  }

  const score = scoreQuizAttempt(orderedQuestions, answers ?? {});
  const flags = buildSecurityFlags({
    score,
    questionIds,
    submittedIds,
    serverCalculatedTime,
    clientReportedTime,
    expired,
    duplicateSubmit: false
  });
  const suspicious = suspiciousScore(flags);
  const reviewStatus = reviewStatusFor(suspicious);
  const userRef = db.collection("users").doc(decoded.uid);
  const attemptRef = db.collection("attempts").doc();
  const assignmentId = asString(session.assignmentId);
  const classId = asString(session.classId);
  const submissionRef = assignmentId
    ? db.collection("assignmentSubmissions").doc(`${assignmentId}_${decoded.uid}`)
    : null;
  const classLeaderboardRef = classId
    ? db.collection("classLeaderboardRows").doc(`${classId}_${decoded.uid}`)
    : null;

  const userSnapshot = await userRef.get();
  const userData = userSnapshot.data() ?? {};
  const previousPlayed = asNumber(userData.totalQuizzesPlayed);
  const currentAverage = asNumber(userData.averageAccuracy);
  const currentXp = asNumber(userData.xp);
  const currentStreak = asNumber(userData.currentStreak);
  const longestStreak = asNumber(userData.longestStreak);
  const existingBadges = normalizeBadges(userData.earnedBadges);
  const categoryIdsPlayed = Array.from(
    new Set([...asStringArray(userData.categoryIdsPlayed), quiz.categoryId].filter(Boolean))
  );
  const personalBestStatus: PersonalBestStatus = !previousBest
    ? "first"
    : score.score > previousBest.score ||
        (score.score === previousBest.score &&
          (score.accuracy > previousBest.accuracy ||
            serverCalculatedTime < previousBest.timeTakenSeconds))
      ? "new-best"
      : score.score === previousBest.score
        ? "matched"
        : "below-best";
  const personalBestDelta = score.score - (previousBest?.score ?? 0);
  const nextPlayed = previousPlayed + 1;
  const nextAverage = Math.round(((currentAverage * previousPlayed + score.accuracy) / nextPlayed) * 10) / 10;
  const streak = calculateStreakUpdate({
    lastPlayedDate: asString(userData.lastPlayedDate) || null,
    currentStreak,
    longestStreak,
    now: submittedAt
  });
  const badges = evaluateBadgesForAttempt({
    attempt: {
      score: score.score,
      totalPoints: score.totalPoints,
      accuracy: score.accuracy,
      timeTakenSeconds: serverCalculatedTime,
      totalQuestions: score.totalQuestions
    },
    profile: { earnedBadges: existingBadges } as UserProfile,
    nextTotalPlayed: nextPlayed,
    streakAfter: streak.currentStreak,
    categoryIdsPlayed,
    personalBestStatus,
    now: submittedAt
  });
  const xp = calculateXPForAttempt({
    score: score.score,
    accuracy: score.accuracy,
    currentXp,
    timeTakenSeconds: serverCalculatedTime,
    totalQuestions: score.totalQuestions,
    streakAfter: streak.currentStreak,
    personalBestStatus
  });
  const assignmentDueAt = toDate(session.assignmentDueAt);
  const late = Boolean(assignmentDueAt && submittedAt.getTime() > assignmentDueAt.getTime());

  let attempt: Attempt | null = null;
  await db.runTransaction(async (transaction) => {
    const freshSessionSnapshot = await transaction.get(sessionRef);
    const freshSession = freshSessionSnapshot.data() ?? {};
    if (asString(freshSession.status) === "submitted" && asString(freshSession.attemptId)) {
      attempt = null;
      return;
    }
    if (asString(freshSession.status) !== "active") {
      throw new Error("This attempt session is not active.");
    }

    const displayName = profileName(decoded, userData);
    const photoURL = profilePhoto(decoded, userData);
    const payload = {
      userId: decoded.uid,
      mode: assignmentId ? ("assignment" as AttemptMode) : ("solo" as AttemptMode),
      roomId: null,
      roomCode: null,
      classId: classId || null,
      className: asString(session.className) || null,
      assignmentId: assignmentId || null,
      assignmentTitle: asString(session.assignmentTitle) || null,
      userDisplayName: displayName,
      userPhotoURL: photoURL,
      quizId: quiz.id,
      quizSlug: quiz.slug,
      quizTitle: quiz.title,
      categoryId: quiz.categoryId,
      categoryName: quiz.categoryName,
      difficulty: quiz.difficulty,
      status: "completed",
      score: score.score,
      totalPoints: score.totalPoints,
      correctCount: score.correctCount,
      wrongCount: score.wrongCount,
      skippedCount: score.skippedCount,
      totalQuestions: score.totalQuestions,
      accuracy: score.accuracy,
      timeTakenSeconds: serverCalculatedTime,
      startedAt,
      completedAt: submittedAt,
      answers: score.answers,
      xpEarned: xp.xpEarned,
      levelBefore: xp.levelBefore,
      levelAfter: xp.levelAfter,
      streakAfter: streak.currentStreak,
      badgeUnlocks: badges.newlyEarnedBadges,
      personalBestStatus,
      personalBestDelta,
      leaderboardUpdated: false,
      scoringSource: "server",
      trusted: true,
      attemptSessionId,
      securityFlags: flags,
      suspiciousScore: suspicious,
      reviewStatus,
      hiddenFromLeaderboard: reviewStatus === "flagged",
      serverScoredAt: FieldValue.serverTimestamp(),
      clientReportedTime,
      serverCalculatedTime,
      timingDrift: clientReportedTime === null ? 0 : Math.abs(serverCalculatedTime - clientReportedTime),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    transaction.set(attemptRef, payload);
    transaction.update(sessionRef, {
      status: "submitted",
      submittedAt,
      attemptId: attemptRef.id,
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(
      userRef,
      {
        uid: decoded.uid,
        email: asString(userData.email, decoded.email ?? ""),
        displayName,
        photoURL,
        role: asString(userData.role, "user"),
        totalQuizzesPlayed: nextPlayed,
        averageAccuracy: nextAverage,
        xp: xp.nextTotalXp,
        level: xp.nextLevel,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastPlayedDate: streak.lastPlayedDate,
        streakUpdatedAt: FieldValue.serverTimestamp(),
        earnedBadges: badges.earnedBadges,
        lastBadgeUnlocks: badges.newlyEarnedBadges,
        categoryIdsPlayed,
        assignmentsCompleted: asNumber(userData.assignmentsCompleted) + (assignmentId ? 1 : 0),
        assignmentAverageAccuracy: assignmentId
          ? Math.round(
              ((asNumber(userData.assignmentAverageAccuracy) * asNumber(userData.assignmentsCompleted) +
                score.accuracy) /
                (asNumber(userData.assignmentsCompleted) + 1)) *
                10
            ) / 10
          : asNumber(userData.assignmentAverageAccuracy),
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    if (submissionRef && assignmentId && classId) {
      transaction.set(
        submissionRef,
        {
          assignmentId,
          classId,
          quizId: quiz.id,
          userId: decoded.uid,
          userDisplayName: displayName,
          attemptId: attemptRef.id,
          status: late ? "late" : "submitted",
          score: score.score,
          totalPoints: score.totalPoints,
          accuracy: score.accuracy,
          timeTakenSeconds: serverCalculatedTime,
          submittedAt,
          dueAt: assignmentDueAt,
          trusted: true,
          scoringSource: "server",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
    if (classLeaderboardRef && classId) {
      transaction.set(
        classLeaderboardRef,
        {
          classId,
          userId: decoded.uid,
          displayName,
          photoURL,
          completedAssignments: FieldValue.increment(1),
          totalScore: FieldValue.increment(score.score),
          averageAccuracy: score.accuracy,
          lastSubmittedAt: submittedAt,
          trusted: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }
    attempt = {
      id: attemptRef.id,
      ...payload,
      mode: assignmentId ? "assignment" : "solo",
      status: "completed",
      roomId: null,
      roomCode: null,
      classId: classId || null,
      className: asString(session.className) || null,
      assignmentId: assignmentId || null,
      assignmentTitle: asString(session.assignmentTitle) || null,
      userPhotoURL: photoURL,
      startedAt: startedAt.toISOString(),
      completedAt: submittedAt.toISOString(),
      serverScoredAt: submittedAt.toISOString(),
      createdAt: null,
      updatedAt: null
    } as Attempt;
  });

  const completedAttempt = attempt as Attempt | null;
  if (!completedAttempt) {
    const freshSession = (await sessionRef.get()).data() ?? {};
    const existingAttemptId = asString(freshSession.attemptId);
    return {
      attemptId: existingAttemptId,
      resultPath: assignmentId ? `/assignments/${assignmentId}/result?attemptId=${existingAttemptId}` : `/result/${existingAttemptId}`,
      duplicate: true
    };
  }

  await updateTrustedLeaderboardsForAttempt(completedAttempt);
  await attemptRef.set(
    { leaderboardUpdated: !completedAttempt.hiddenFromLeaderboard, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return {
    attemptId: attemptRef.id,
    resultPath: assignmentId ? `/assignments/${assignmentId}/result?attemptId=${attemptRef.id}` : `/result/${attemptRef.id}`,
    duplicate: false
  };
}

export async function scoreTrustedRoomAnswer({
  room,
  question,
  answer
}: {
  room: RawData & { id: string };
  question: Question;
  answer: QuizAnswerState;
}) {
  const scored = scoreSingleQuestion(question, answer);
  const startedAt = toDate(room.questionStartedAt)?.getTime() ?? Date.now();
  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const speedBonus =
    room.settings &&
    typeof room.settings === "object" &&
    (room.settings as RawData).scoringMode === "speed-bonus" &&
    scored.isCorrect
      ? Math.max(
          0,
          Math.round(
            Math.min(5, question.points * 0.25) *
              (1 -
                Math.min(timeTakenSeconds, asNumber((room.settings as RawData).questionTimerSeconds, 30)) /
                  asNumber((room.settings as RawData).questionTimerSeconds, 30))
          )
        )
      : 0;
  return { ...scored, pointsEarned: scored.pointsEarned + speedBonus, timeTakenSeconds };
}

export async function getSafeRoomQuestions(roomId: string) {
  const db = getAdminDb();
  const roomSnapshot = await db.collection("rooms").doc(roomId).get();
  if (!roomSnapshot.exists) throw new Error("Room was not found.");
  const room = roomSnapshot.data() ?? {};
  const questions = await listQuestions(asString(room.quizId));
  const order = new Map(asStringArray(room.questionOrder).map((id, index) => [id, index]));
  return questions
    .sort((first, second) => (order.get(first.id) ?? 999) - (order.get(second.id) ?? 999))
    .map(safeQuestion);
}

export async function getFullRoomQuestions(room: RawData) {
  const questions = await listQuestions(asString(room.quizId));
  const order = new Map(asStringArray(room.questionOrder).map((id, index) => [id, index]));
  return questions.sort((first, second) => (order.get(first.id) ?? 999) - (order.get(second.id) ?? 999));
}
