import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import {
  listAdminCategories,
  listAdminQuizzes,
  listQuestionsForQuiz,
  getAdminCounts
} from "@/lib/firestore/content";
import { listAdminFeedback } from "@/lib/firestore/feedback";
import { listAdminLeaderboardEntries } from "@/lib/firestore/leaderboards";
import { mapQuestion } from "@/lib/firestore/mappers";
import { listRecentMatchmakingQueues } from "@/lib/firestore/matchmaking";
import { listAdminReports } from "@/lib/firestore/reports";
import { listRecentAdminAttempts } from "@/lib/firestore/attempts";
import { listRecentAdminRooms } from "@/lib/firestore/rooms";
import { getCurrentDailyChallenge } from "@/lib/firestore/admin-content-controls";
import { toIso } from "@/lib/firestore/timestamps";
import { normalizeBadges } from "@/lib/quiz/gamification";
import type {
  AdminAnalyticsSnapshot,
  DataCleanupIssue,
  Question,
  QuestionQualityRow,
  Quiz,
  UserProfile,
  UserRole
} from "@/types/domain";

const defaultAdminLimit = 100;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const teacherProfile =
    data.teacherProfile && typeof data.teacherProfile === "object"
      ? (data.teacherProfile as Record<string, unknown>)
      : {};
  return {
    uid,
    displayName: asString(data.displayName, "Quizora Player"),
    email: asString(data.email),
    photoURL: asString(data.photoURL) || null,
    role: data.role === "admin" ? "admin" : ("user" satisfies UserRole),
    xp: asNumber(data.xp),
    level: asNumber(data.level, 1),
    totalQuizzesPlayed: asNumber(data.totalQuizzesPlayed),
    averageAccuracy: asNumber(data.averageAccuracy),
    currentStreak: asNumber(data.currentStreak),
    longestStreak: asNumber(data.longestStreak),
    lastPlayedDate: asString(data.lastPlayedDate) || null,
    streakUpdatedAt: toIso(data.streakUpdatedAt),
    earnedBadges: normalizeBadges(data.earnedBadges),
    lastBadgeUnlocks: normalizeBadges(data.lastBadgeUnlocks),
    categoryIdsPlayed: asStringArray(data.categoryIdsPlayed),
    creatorStatus:
      data.creatorStatus === "pending" ||
      data.creatorStatus === "approved" ||
      data.creatorStatus === "suspended"
        ? data.creatorStatus
        : "none",
    teacherProfile: {
      displayTitle: asString(teacherProfile.displayTitle),
      organizationName: asString(teacherProfile.organizationName),
      bio: asString(teacherProfile.bio),
      subjectFocus: asString(teacherProfile.subjectFocus),
      verified: teacherProfile.verified === true,
      createdAt: toIso(teacherProfile.createdAt),
      updatedAt: toIso(teacherProfile.updatedAt)
    },
    createdClassCount: asNumber(data.createdClassCount),
    joinedClassCount: asNumber(data.joinedClassCount),
    creatorQuizCount: asNumber(data.creatorQuizCount),
    assignmentsCompleted: asNumber(data.assignmentsCompleted),
    assignmentAverageAccuracy: asNumber(data.assignmentAverageAccuracy),
    bestClassRank: asNumber(data.bestClassRank),
    lastCreatorActivityAt: toIso(data.lastCreatorActivityAt),
    quickMatchesPlayed: asNumber(data.quickMatchesPlayed),
    quickMatchesWon: asNumber(data.quickMatchesWon),
    quickMatchBestRank: asNumber(data.quickMatchBestRank),
    quickMatchAverageAccuracy: asNumber(data.quickMatchAverageAccuracy),
    botMatchesPlayed: asNumber(data.botMatchesPlayed),
    challengeMatchesPlayed: asNumber(data.challengeMatchesPlayed),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    lastActiveAt: toIso(data.lastActiveAt)
  };
}

export async function listAdminUsers(count = defaultAdminLimit) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "users"), orderBy("lastActiveAt", "desc"), limit(count))
  );
  return snapshot.docs.map((item) => normalizeProfile(item.id, item.data()));
}

export async function listRecentAdminQuestions(count = 160): Promise<Question[]> {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "questions"), orderBy("updatedAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapQuestion);
}

export async function listQuizPerformanceRows(count = 80) {
  const [quizzes, attempts] = await Promise.all([
    listAdminQuizzes(),
    listRecentAdminAttempts(250)
  ]);

  return quizzes.slice(0, count).map((quiz) => {
    const quizAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);
    const uniquePlayers = new Set(quizAttempts.map((attempt) => attempt.userId)).size;
    const averageAccuracy = quizAttempts.length
      ? Math.round(
          quizAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) /
            quizAttempts.length
        )
      : 0;
    const averageScore = quizAttempts.length
      ? Math.round(
          quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            quizAttempts.length
        )
      : 0;
    const averageTimeSeconds = quizAttempts.length
      ? Math.round(
          quizAttempts.reduce((sum, attempt) => sum + attempt.timeTakenSeconds, 0) /
            quizAttempts.length
        )
      : 0;

    return {
      quiz,
      attempts: quizAttempts.length,
      uniquePlayers,
      averageAccuracy,
      averageScore,
      averageTimeSeconds,
      status:
        quizAttempts.length >= 3 && averageAccuracy < 45
          ? "review-needed"
          : quiz.questionCount <= 0
            ? "needs-questions"
            : "healthy"
    };
  });
}

export async function listQuestionQualityRows(count = 120): Promise<QuestionQualityRow[]> {
  const [questions, quizzes, attempts, reports] = await Promise.all([
    listRecentAdminQuestions(count),
    listAdminQuizzes(),
    listRecentAdminAttempts(250),
    listAdminReports({ count: 160 })
  ]);
  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const questionReports = reports.filter((report) => report.type === "question");

  return questions.map((question) => {
    const quiz = quizMap.get(question.quizId);
    const answerSnapshots = attempts.flatMap((attempt) =>
      attempt.answers.filter((answer) => answer.questionId === question.id)
    );
    const timesAnswered = answerSnapshots.length;
    const correct = answerSnapshots.filter((answer) => answer.isCorrect).length;
    const skipped = answerSnapshots.filter(
      (answer) => !answer.selectedAnswer && answer.selectedAnswers.length === 0
    ).length;
    const wrong = Math.max(0, timesAnswered - correct - skipped);
    const correctRate = timesAnswered ? Math.round((correct / timesAnswered) * 100) : 0;
    const skippedRate = timesAnswered ? Math.round((skipped / timesAnswered) * 100) : 0;
    const wrongRate = timesAnswered ? Math.round((wrong / timesAnswered) * 100) : 0;
    const averageTimeSeconds = timesAnswered
      ? Math.round(
          answerSnapshots.reduce((sum, answer) => sum + answer.timeSpentSeconds, 0) /
            timesAnswered
        )
      : 0;
    const reportCount = questionReports.filter((report) => report.targetId === question.id).length;
    const signals = [
      !question.explanation.trim() ? "Missing explanation" : "",
      question.options.length < 2 && question.type !== "text" ? "Few options" : "",
      question.status === "hidden" ? "Hidden" : "",
      timesAnswered >= 3 && correctRate < 45 ? "Low correct rate" : "",
      timesAnswered >= 3 && skippedRate > 35 ? "High skipped rate" : "",
      reportCount ? `${reportCount} report${reportCount === 1 ? "" : "s"}` : ""
    ].filter((signal): signal is string => Boolean(signal));

    return {
      question,
      quizTitle: quiz?.title ?? "Unknown quiz",
      categoryName: quiz?.categoryName ?? "Uncategorized",
      difficulty: quiz?.difficulty ?? "easy",
      timesAnswered,
      correctRate,
      wrongRate,
      skippedRate,
      averageTimeSeconds,
      reportCount,
      signals,
      reviewNeeded: signals.length > 0
    };
  });
}

function issue(
  id: string,
  title: string,
  description: string,
  severity: DataCleanupIssue["severity"],
  targetType: string,
  targetId: string,
  targetHref: string,
  actionLabel = "Open"
): DataCleanupIssue {
  return { id, title, description, severity, targetType, targetId, targetHref, actionLabel };
}

export async function listDataCleanupIssues(count = 40): Promise<DataCleanupIssue[]> {
  const [quizzes, categories, questions, rooms, queues, leaderboards] = await Promise.all([
    listAdminQuizzes(),
    listAdminCategories(),
    listRecentAdminQuestions(180),
    listRecentAdminRooms(80),
    listRecentMatchmakingQueues(80),
    listAdminLeaderboardEntries(120)
  ]);
  const issues: DataCleanupIssue[] = [];
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const slugCounts = new Map<string, Quiz[]>();

  quizzes.forEach((quiz) => {
    slugCounts.set(quiz.slug, [...(slugCounts.get(quiz.slug) ?? []), quiz]);
    if (quiz.status === "draft" && quiz.questionCount === 0) {
      issues.push(issue(`draft-${quiz.id}`, "Draft has no questions", quiz.title, "info", "quiz", quiz.id, `/admin/quizzes`));
    }
    if (quiz.status === "published" && quiz.questionCount === 0) {
      issues.push(issue(`empty-published-${quiz.id}`, "Published quiz has no active questions", quiz.title, "danger", "quiz", quiz.id, `/admin/quizzes`));
    }
    if (quiz.status === "published" && quiz.visibility === "public" && !quiz.shortDescription.trim()) {
      issues.push(issue(`seo-${quiz.id}`, "Published quiz missing short description", quiz.title, "warning", "quiz", quiz.id, `/admin/quizzes`));
    }
    const category = categoryMap.get(quiz.categoryId);
    if (category?.status === "hidden" && quiz.status === "published" && quiz.visibility === "public") {
      issues.push(issue(`hidden-category-${quiz.id}`, "Public quiz uses hidden category", `${quiz.title} is assigned to ${category.name}.`, "warning", "quiz", quiz.id, `/admin/quizzes`));
    }
  });

  slugCounts.forEach((items, slug) => {
    if (slug && items.length > 1) {
      issues.push(issue(`duplicate-slug-${slug}`, "Duplicate quiz slug", `${items.length} quizzes use /${slug}.`, "danger", "quiz", items[0].id, "/admin/quizzes"));
    }
  });

  questions.forEach((question) => {
    if (!question.explanation.trim()) {
      issues.push(issue(`explanation-${question.id}`, "Question missing explanation", question.questionText, "warning", "question", question.id, `/admin/quizzes/${question.quizId}/questions`));
    }
  });

  const now = Date.now();
  rooms.forEach((room) => {
    const created = room.createdAt ? new Date(room.createdAt).getTime() : now;
    if (room.status === "waiting" && now - created > 24 * 60 * 60 * 1000) {
      issues.push(issue(`stale-room-${room.id}`, "Stale waiting room", room.roomCode, "warning", "room", room.id, `/admin/rooms/${room.id}`));
    }
  });

  queues.forEach((queue) => {
    const expires = queue.expiresAt ? new Date(queue.expiresAt).getTime() : now;
    if (queue.status === "searching" && expires < now) {
      issues.push(issue(`stale-queue-${queue.id}`, "Expired queue still searching", queue.displayName, "warning", "matchmakingQueue", queue.id, "/admin/rooms"));
    }
  });

  leaderboards.forEach((entry) => {
    if (entry.userId.startsWith("bot_")) {
      issues.push(issue(`bot-leaderboard-${entry.id}`, "Bot entry on real leaderboard", entry.userDisplayName, "danger", "leaderboard", entry.id, "/admin/leaderboards"));
    }
  });

  return issues.slice(0, count);
}

export async function getAdminAnalyticsSnapshot(): Promise<AdminAnalyticsSnapshot> {
  const [counts, recentAttempts, recentRooms, recentQueues, reports, feedback, dailyChallenge, contentIssues] =
    await Promise.all([
      getAdminCounts(),
      listRecentAdminAttempts(80),
      listRecentAdminRooms(80),
      listRecentMatchmakingQueues(50),
      listAdminReports({ count: 50 }),
      listAdminFeedback({ count: 50 }),
      getCurrentDailyChallenge(),
      listDataCleanupIssues(12)
    ]);

  return {
    counts,
    recentAttempts,
    recentRooms,
    recentQueues,
    reports,
    feedback,
    dailyChallenge,
    contentIssues
  };
}

export async function listQuestionsForAdminQuiz(quizId: string) {
  return listQuestionsForQuiz(quizId);
}
