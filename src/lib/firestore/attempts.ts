import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapAttempt, mapQuestion, mapQuiz } from "@/lib/firestore/mappers";
import { updateLeaderboardsForAttempt } from "@/lib/firestore/leaderboards";
import {
  calculateStreakUpdate,
  evaluateBadgesForAttempt,
  normalizeBadges
} from "@/lib/quiz/gamification";
import { scoreQuizAttempt } from "@/lib/quiz/scoring";
import { calculateXPForAttempt } from "@/lib/quiz/xp";
import type {
  Attempt,
  AttemptAnswer,
  PersonalBestStatus,
  Question,
  Quiz,
  QuizAnswerState,
  ReviewStatus,
  Room,
  RoomAnswer,
  RoomResult,
  UserProfile
} from "@/types/domain";

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function attemptsCollection() {
  return collection(ensureDb(), "attempts");
}

const playableQuestionLimit = 250;

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isBetterAttemptScore(
  incoming: {
    score: number;
    accuracy: number;
    timeTakenSeconds: number;
    completedAt: string | null;
  },
  existing: Attempt
) {
  if (incoming.score !== existing.score) return incoming.score > existing.score;
  if (incoming.accuracy !== existing.accuracy) return incoming.accuracy > existing.accuracy;
  if (incoming.timeTakenSeconds !== existing.timeTakenSeconds) {
    return incoming.timeTakenSeconds < existing.timeTakenSeconds;
  }
  if (!incoming.completedAt || !existing.completedAt) return false;
  return new Date(incoming.completedAt).getTime() < new Date(existing.completedAt).getTime();
}

export async function getPlayableQuiz(quizId: string): Promise<Quiz | null> {
  const snapshot = await getDoc(doc(ensureDb(), "quizzes", quizId));
  if (!snapshot.exists()) return null;
  const quiz = mapQuiz(snapshot);
  if (quiz.status !== "published" || quiz.visibility !== "public") return null;
  return quiz;
}

export async function listActivePlayQuestions(quizId: string): Promise<Question[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "questions"),
      where("quizId", "==", quizId),
      where("status", "==", "active"),
      orderBy("order", "asc"),
      limit(playableQuestionLimit)
    )
  );
  return snapshot.docs.map(mapQuestion);
}

export async function saveCompletedAttempt({
  user,
  profile,
  quiz,
  questions,
  answers,
  startedAtMs,
  completedAtMs,
  assignmentContext
}: {
  user: User;
  profile: UserProfile | null;
  quiz: Quiz;
  questions: Question[];
  answers: Record<string, QuizAnswerState>;
  startedAtMs: number;
  completedAtMs: number;
  assignmentContext?: {
    assignmentId: string;
    assignmentTitle: string;
    classId: string;
    className: string;
    dueAt: string | null;
  };
}) {
  const clientDb = ensureDb();
  const score = scoreQuizAttempt(questions, answers);
  const userRef = doc(clientDb, "users", user.uid);
  const attemptRef = doc(attemptsCollection());
  const submissionRef = assignmentContext
    ? doc(clientDb, "assignmentSubmissions", `${assignmentContext.assignmentId}_${user.uid}`)
    : null;
  const classLeaderboardRef = assignmentContext
    ? doc(clientDb, "classLeaderboardRows", `${assignmentContext.classId}_${user.uid}`)
    : null;
  const completedAtIso = new Date(completedAtMs).toISOString();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const timeTakenSeconds = Math.max(0, Math.round((completedAtMs - startedAtMs) / 1000));
  const previousBest = await getPreviousBestAttemptForQuiz(user.uid, quiz.id);
  const personalBestStatus: PersonalBestStatus = !previousBest
    ? "first"
    : isBetterAttemptScore(
        {
          score: score.score,
          accuracy: score.accuracy,
          timeTakenSeconds,
          completedAt: completedAtIso
        },
        previousBest
      )
      ? "new-best"
      : score.score === previousBest.score
        ? "matched"
        : "below-best";
  const personalBestDelta = score.score - (previousBest?.score ?? 0);
  let savedAttempt: Attempt | null = null;

  await runTransaction(clientDb, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const classLeaderboardSnapshot = classLeaderboardRef
      ? await transaction.get(classLeaderboardRef)
      : null;
    const userData = userSnapshot.data() ?? {};
    const currentXp =
      typeof userData.xp === "number" ? userData.xp : profile?.xp ?? 0;
    const currentPlayed =
      typeof userData.totalQuizzesPlayed === "number"
        ? userData.totalQuizzesPlayed
        : profile?.totalQuizzesPlayed ?? 0;
    const currentAverage =
      typeof userData.averageAccuracy === "number"
        ? userData.averageAccuracy
        : profile?.averageAccuracy ?? 0;
    const currentStreak =
      typeof userData.currentStreak === "number"
        ? userData.currentStreak
        : profile?.currentStreak ?? 0;
    const longestStreak =
      typeof userData.longestStreak === "number"
        ? userData.longestStreak
        : profile?.longestStreak ?? 0;
    const lastPlayedDate =
      typeof userData.lastPlayedDate === "string"
        ? userData.lastPlayedDate
        : profile?.lastPlayedDate ?? null;
    const existingBadges = normalizeBadges(userData.earnedBadges ?? profile?.earnedBadges);
    const categoryIdsPlayed = Array.from(
      new Set([
        ...asStringArray(userData.categoryIdsPlayed ?? profile?.categoryIdsPlayed),
        quiz.categoryId
      ].filter(Boolean))
    );
    const nextPlayed = currentPlayed + 1;
    const nextAverage =
      Math.round(((currentAverage * currentPlayed + score.accuracy) / nextPlayed) * 10) / 10;
    const streak = calculateStreakUpdate({
      lastPlayedDate,
      currentStreak,
      longestStreak,
      now: new Date(completedAtMs)
    });
    const badgeProfile = profile ? { ...profile, earnedBadges: existingBadges } : null;
    const badges = evaluateBadgesForAttempt({
      attempt: {
        score: score.score,
        totalPoints: score.totalPoints,
        accuracy: score.accuracy,
        timeTakenSeconds,
        totalQuestions: score.totalQuestions
      },
      profile: badgeProfile,
      nextTotalPlayed: nextPlayed,
      streakAfter: streak.currentStreak,
      categoryIdsPlayed,
      personalBestStatus,
      now: new Date(completedAtMs)
    });
    const xp = calculateXPForAttempt({
      score: score.score,
      accuracy: score.accuracy,
      currentXp,
      timeTakenSeconds,
      totalQuestions: score.totalQuestions,
      streakAfter: streak.currentStreak,
      personalBestStatus
    });

    const attemptPayload = {
      userId: user.uid,
      mode: assignmentContext ? ("assignment" as const) : ("solo" as const),
      roomId: null,
      roomCode: null,
      classId: assignmentContext?.classId ?? null,
      className: assignmentContext?.className ?? null,
      assignmentId: assignmentContext?.assignmentId ?? null,
      assignmentTitle: assignmentContext?.assignmentTitle ?? null,
      userDisplayName:
        profile?.displayName || user.displayName || user.email || "Quizora Player",
      userPhotoURL: profile?.photoURL || user.photoURL || null,
      quizId: quiz.id,
      quizSlug: quiz.slug,
      quizTitle: quiz.title,
      categoryId: quiz.categoryId,
      categoryName: quiz.categoryName,
      difficulty: quiz.difficulty,
      status: "completed" as const,
      score: score.score,
      totalPoints: score.totalPoints,
      correctCount: score.correctCount,
      wrongCount: score.wrongCount,
      skippedCount: score.skippedCount,
      totalQuestions: score.totalQuestions,
      accuracy: score.accuracy,
      timeTakenSeconds,
      startedAt: new Date(startedAtMs),
      completedAt: new Date(completedAtMs),
      answers: score.answers,
      xpEarned: xp.xpEarned,
      levelBefore: xp.levelBefore,
      levelAfter: xp.levelAfter,
      streakAfter: streak.currentStreak,
      badgeUnlocks: badges.newlyEarnedBadges,
      personalBestStatus,
      personalBestDelta,
      leaderboardUpdated: false,
      scoringSource: "client",
      trusted: false,
      attemptSessionId: null,
      securityFlags: [],
      suspiciousScore: 0,
      reviewStatus: "none",
      hiddenFromLeaderboard: false,
      serverScoredAt: null,
      clientReportedTime: timeTakenSeconds,
      serverCalculatedTime: timeTakenSeconds,
      timingDrift: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    transaction.set(attemptRef, attemptPayload);
    if (submissionRef && assignmentContext) {
      const late =
        assignmentContext.dueAt && completedAtMs > new Date(assignmentContext.dueAt).getTime();
      transaction.set(
        submissionRef,
        {
          assignmentId: assignmentContext.assignmentId,
          classId: assignmentContext.classId,
          quizId: quiz.id,
          userId: user.uid,
          userDisplayName:
            profile?.displayName || user.displayName || user.email || "Quizora Student",
          attemptId: attemptRef.id,
          status: late ? "late" : "submitted",
          score: score.score,
          totalPoints: score.totalPoints,
          accuracy: score.accuracy,
          timeTakenSeconds,
          submittedAt: new Date(completedAtMs),
          dueAt: assignmentContext.dueAt ? new Date(assignmentContext.dueAt) : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      if (classLeaderboardRef) {
        const rowData = classLeaderboardSnapshot?.data() ?? {};
        const completedAssignments =
          (typeof rowData.completedAssignments === "number" ? rowData.completedAssignments : 0) + 1;
        const totalScore = (typeof rowData.totalScore === "number" ? rowData.totalScore : 0) + score.score;
        const previousAccuracyTotal =
          (typeof rowData.averageAccuracy === "number" ? rowData.averageAccuracy : 0) *
          Math.max(0, completedAssignments - 1);
        transaction.set(
          classLeaderboardRef,
          {
            classId: assignmentContext.classId,
            userId: user.uid,
            displayName:
              profile?.displayName || user.displayName || user.email || "Quizora Student",
            photoURL: profile?.photoURL || user.photoURL || null,
            completedAssignments,
            totalScore,
            averageAccuracy: Math.round((previousAccuracyTotal + score.accuracy) / completedAssignments),
            lastSubmittedAt: new Date(completedAtMs),
            createdAt: rowData.createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
    }

    transaction.update(userRef, {
      totalQuizzesPlayed: nextPlayed,
      averageAccuracy: nextAverage,
      xp: xp.nextTotalXp,
      level: xp.nextLevel,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastPlayedDate: streak.lastPlayedDate,
      streakUpdatedAt: serverTimestamp(),
      earnedBadges: badges.earnedBadges,
      lastBadgeUnlocks: badges.newlyEarnedBadges,
      categoryIdsPlayed,
      assignmentsCompleted:
        (typeof userData.assignmentsCompleted === "number"
          ? userData.assignmentsCompleted
          : profile?.assignmentsCompleted ?? 0) + (assignmentContext ? 1 : 0),
      assignmentAverageAccuracy: assignmentContext
        ? Math.round(
            ((((typeof userData.assignmentAverageAccuracy === "number"
              ? userData.assignmentAverageAccuracy
              : profile?.assignmentAverageAccuracy ?? 0) *
              (typeof userData.assignmentsCompleted === "number"
                ? userData.assignmentsCompleted
                : profile?.assignmentsCompleted ?? 0)) +
              score.accuracy) /
              ((typeof userData.assignmentsCompleted === "number"
                ? userData.assignmentsCompleted
                : profile?.assignmentsCompleted ?? 0) +
                1)) *
              10
          ) / 10
        : typeof userData.assignmentAverageAccuracy === "number"
          ? userData.assignmentAverageAccuracy
          : profile?.assignmentAverageAccuracy ?? 0,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    savedAttempt = {
      id: attemptRef.id,
      mode: assignmentContext ? "assignment" : "solo",
      roomId: null,
      roomCode: null,
      classId: assignmentContext?.classId ?? null,
      className: assignmentContext?.className ?? null,
      assignmentId: assignmentContext?.assignmentId ?? null,
      assignmentTitle: assignmentContext?.assignmentTitle ?? null,
      userId: attemptPayload.userId,
      userDisplayName: attemptPayload.userDisplayName,
      userPhotoURL: attemptPayload.userPhotoURL,
      quizId: attemptPayload.quizId,
      quizSlug: attemptPayload.quizSlug,
      quizTitle: attemptPayload.quizTitle,
      categoryId: attemptPayload.categoryId,
      categoryName: attemptPayload.categoryName,
      difficulty: attemptPayload.difficulty,
      status: "completed",
      score: attemptPayload.score,
      totalPoints: attemptPayload.totalPoints,
      correctCount: attemptPayload.correctCount,
      wrongCount: attemptPayload.wrongCount,
      skippedCount: attemptPayload.skippedCount,
      totalQuestions: attemptPayload.totalQuestions,
      accuracy: attemptPayload.accuracy,
      timeTakenSeconds,
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      answers: score.answers,
      xpEarned: xp.xpEarned,
      levelBefore: xp.levelBefore,
      levelAfter: xp.levelAfter,
      streakAfter: streak.currentStreak,
      badgeUnlocks: badges.newlyEarnedBadges,
      personalBestStatus,
      personalBestDelta,
      leaderboardUpdated: false,
      scoringSource: "client",
      trusted: false,
      attemptSessionId: null,
      securityFlags: [],
      suspiciousScore: 0,
      reviewStatus: "none",
      hiddenFromLeaderboard: false,
      serverScoredAt: null,
      clientReportedTime: timeTakenSeconds,
      serverCalculatedTime: timeTakenSeconds,
      timingDrift: 0,
      createdAt: null,
      updatedAt: null
    };
  });

  if (savedAttempt && !assignmentContext) {
    try {
      await updateLeaderboardsForAttempt(savedAttempt, profile);
      await updateDoc(attemptRef, {
        leaderboardUpdated: true,
        updatedAt: serverTimestamp()
      });
    } catch {
      // Attempts remain the source of truth. Leaderboards can be rebuilt from admin.
    }
  }

  return attemptRef.id;
}

function roomAnswersToAttemptAnswers(answers: RoomAnswer[]): AttemptAnswer[] {
  return [...answers]
    .sort((first, second) => first.questionIndex - second.questionIndex)
    .map((answer) => ({
      questionId: answer.questionId,
      questionTextSnapshot: answer.questionTextSnapshot,
      type: answer.type,
      selectedAnswer: answer.selectedAnswer,
      selectedAnswers: answer.selectedAnswers,
      correctAnswer: answer.correctAnswer,
      correctAnswers: answer.correctAnswers,
      isCorrect: answer.isCorrect,
      pointsEarned: answer.pointsEarned,
      pointsPossible: answer.pointsPossible,
      timeSpentSeconds: answer.timeTakenSeconds,
      explanationSnapshot: answer.explanationSnapshot,
      optionsSnapshot: answer.optionsSnapshot
    }));
}

export async function saveLiveRoomAttempt({
  user,
  profile,
  room,
  result,
  answers
}: {
  user: User;
  profile: UserProfile | null;
  room: Room;
  result: RoomResult;
  answers: RoomAnswer[];
}) {
  const clientDb = ensureDb();
  const attemptId = `live_${room.id}_${user.uid}`;
  const attemptRef = doc(clientDb, "attempts", attemptId);
  const resultRef = doc(clientDb, "roomResults", result.id);
  const userRef = doc(clientDb, "users", user.uid);
  const attemptAnswers = roomAnswersToAttemptAnswers(answers);
  const completedAtMs = result.completedAt
    ? new Date(result.completedAt).getTime()
    : Date.now();
  const startedAtMs = room.startedAt
    ? new Date(room.startedAt).getTime()
    : completedAtMs - Math.max(0, attemptAnswers.reduce((sum, item) => sum + item.timeSpentSeconds, 0)) * 1000;
  const completedAtIso = new Date(completedAtMs).toISOString();
  const startedAtIso = new Date(startedAtMs).toISOString();
  const timeTakenSeconds = Math.max(0, Math.round((completedAtMs - startedAtMs) / 1000));
  const previousBest = await getPreviousBestAttemptForQuiz(user.uid, room.quizId);
  const personalBestStatus: PersonalBestStatus = !previousBest
    ? "first"
    : isBetterAttemptScore(
        {
          score: result.score,
          accuracy: result.accuracy,
          timeTakenSeconds,
          completedAt: completedAtIso
        },
        previousBest
      )
      ? "new-best"
      : result.score === previousBest.score
        ? "matched"
        : "below-best";
  const personalBestDelta = result.score - (previousBest?.score ?? 0);
  let savedAttempt: Attempt | null = null;
  let alreadySaved = false;

  await runTransaction(clientDb, async (transaction) => {
    const existingAttempt = await transaction.get(attemptRef);
    if (existingAttempt.exists()) {
      alreadySaved = true;
      return;
    }

    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.data() ?? {};
    const currentXp =
      typeof userData.xp === "number" ? userData.xp : profile?.xp ?? 0;
    const currentPlayed =
      typeof userData.totalQuizzesPlayed === "number"
        ? userData.totalQuizzesPlayed
        : profile?.totalQuizzesPlayed ?? 0;
    const currentAverage =
      typeof userData.averageAccuracy === "number"
        ? userData.averageAccuracy
        : profile?.averageAccuracy ?? 0;
    const currentStreak =
      typeof userData.currentStreak === "number"
        ? userData.currentStreak
        : profile?.currentStreak ?? 0;
    const longestStreak =
      typeof userData.longestStreak === "number"
        ? userData.longestStreak
        : profile?.longestStreak ?? 0;
    const lastPlayedDate =
      typeof userData.lastPlayedDate === "string"
        ? userData.lastPlayedDate
        : profile?.lastPlayedDate ?? null;
    const existingBadges = normalizeBadges(userData.earnedBadges ?? profile?.earnedBadges);
    const categoryIdsPlayed = Array.from(
      new Set([
        ...asStringArray(userData.categoryIdsPlayed ?? profile?.categoryIdsPlayed),
        room.categoryId
      ].filter(Boolean))
    );
    const currentQuickMatchesPlayed =
      typeof userData.quickMatchesPlayed === "number"
        ? userData.quickMatchesPlayed
        : profile?.quickMatchesPlayed ?? 0;
    const currentQuickMatchesWon =
      typeof userData.quickMatchesWon === "number"
        ? userData.quickMatchesWon
        : profile?.quickMatchesWon ?? 0;
    const currentQuickMatchBestRank =
      typeof userData.quickMatchBestRank === "number"
        ? userData.quickMatchBestRank
        : profile?.quickMatchBestRank ?? 0;
    const currentQuickMatchAverageAccuracy =
      typeof userData.quickMatchAverageAccuracy === "number"
        ? userData.quickMatchAverageAccuracy
        : profile?.quickMatchAverageAccuracy ?? 0;
    const currentBotMatchesPlayed =
      typeof userData.botMatchesPlayed === "number"
        ? userData.botMatchesPlayed
        : profile?.botMatchesPlayed ?? 0;
    const currentChallengeMatchesPlayed =
      typeof userData.challengeMatchesPlayed === "number"
        ? userData.challengeMatchesPlayed
        : profile?.challengeMatchesPlayed ?? 0;
    const nextPlayed = currentPlayed + 1;
    const nextAverage =
      Math.round(((currentAverage * currentPlayed + result.accuracy) / nextPlayed) * 10) / 10;
    const nextQuickMatchesPlayed =
      room.source === "quick-match" ? currentQuickMatchesPlayed + 1 : currentQuickMatchesPlayed;
    const nextQuickMatchesWon =
      room.source === "quick-match" && result.rank === 1
        ? currentQuickMatchesWon + 1
        : currentQuickMatchesWon;
    const nextQuickMatchAverageAccuracy =
      room.source === "quick-match" && nextQuickMatchesPlayed
        ? Math.round(
            ((currentQuickMatchAverageAccuracy * currentQuickMatchesPlayed + result.accuracy) /
              nextQuickMatchesPlayed) *
              10
          ) / 10
        : currentQuickMatchAverageAccuracy;
    const nextQuickMatchBestRank =
      room.source === "quick-match"
        ? currentQuickMatchBestRank
          ? Math.min(currentQuickMatchBestRank, result.rank)
          : result.rank
        : currentQuickMatchBestRank;
    const nextBotMatchesPlayed =
      room.source === "quick-match" && room.botFillUsed
        ? currentBotMatchesPlayed + 1
        : currentBotMatchesPlayed;
    const nextChallengeMatchesPlayed =
      room.source === "challenge"
        ? currentChallengeMatchesPlayed + 1
        : currentChallengeMatchesPlayed;
    const streak = calculateStreakUpdate({
      lastPlayedDate,
      currentStreak,
      longestStreak,
      now: new Date(completedAtMs)
    });
    const badgeProfile = profile ? { ...profile, earnedBadges: existingBadges } : null;
    const badges = evaluateBadgesForAttempt({
      attempt: {
        score: result.score,
        totalPoints: result.totalPoints,
        accuracy: result.accuracy,
        timeTakenSeconds,
        totalQuestions: room.totalQuestions
      },
      profile: badgeProfile,
      nextTotalPlayed: nextPlayed,
      streakAfter: streak.currentStreak,
      categoryIdsPlayed,
      personalBestStatus,
      now: new Date(completedAtMs)
    });
    const xp = calculateXPForAttempt({
      score: result.score,
      accuracy: result.accuracy,
      currentXp,
      timeTakenSeconds,
      totalQuestions: room.totalQuestions,
      streakAfter: streak.currentStreak,
      personalBestStatus
    });

    const attemptPayload = {
      mode: "live-room" as const,
      roomId: room.id,
      roomCode: room.roomCode,
      classId: room.classId,
      className: room.className,
      assignmentId: null,
      assignmentTitle: null,
      userId: user.uid,
      userDisplayName:
        profile?.displayName || user.displayName || user.email || "Quizora Player",
      userPhotoURL: profile?.photoURL || user.photoURL || null,
      quizId: room.quizId,
      quizSlug: room.quizSlug,
      quizTitle: room.quizTitle,
      categoryId: room.categoryId,
      categoryName: room.categoryName,
      difficulty: room.difficulty,
      status: "completed" as const,
      score: result.score,
      totalPoints: result.totalPoints,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      skippedCount: result.skippedCount,
      totalQuestions: room.totalQuestions,
      accuracy: result.accuracy,
      timeTakenSeconds,
      startedAt: new Date(startedAtMs),
      completedAt: new Date(completedAtMs),
      answers: attemptAnswers,
      xpEarned: xp.xpEarned,
      levelBefore: xp.levelBefore,
      levelAfter: xp.levelAfter,
      streakAfter: streak.currentStreak,
      badgeUnlocks: badges.newlyEarnedBadges,
      personalBestStatus,
      personalBestDelta,
      leaderboardUpdated: false,
      scoringSource: "client",
      trusted: false,
      attemptSessionId: null,
      securityFlags: [],
      suspiciousScore: 0,
      reviewStatus: "none",
      hiddenFromLeaderboard: false,
      serverScoredAt: null,
      clientReportedTime: timeTakenSeconds,
      serverCalculatedTime: timeTakenSeconds,
      timingDrift: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    transaction.set(attemptRef, attemptPayload);
    transaction.update(resultRef, {
      attemptId,
      xpEarned: xp.xpEarned
    });
    transaction.update(userRef, {
      totalQuizzesPlayed: nextPlayed,
      averageAccuracy: nextAverage,
      xp: xp.nextTotalXp,
      level: xp.nextLevel,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastPlayedDate: streak.lastPlayedDate,
      streakUpdatedAt: serverTimestamp(),
      earnedBadges: badges.earnedBadges,
      lastBadgeUnlocks: badges.newlyEarnedBadges,
      categoryIdsPlayed,
      quickMatchesPlayed: nextQuickMatchesPlayed,
      quickMatchesWon: nextQuickMatchesWon,
      quickMatchBestRank: nextQuickMatchBestRank,
      quickMatchAverageAccuracy: nextQuickMatchAverageAccuracy,
      botMatchesPlayed: nextBotMatchesPlayed,
      challengeMatchesPlayed: nextChallengeMatchesPlayed,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    savedAttempt = {
      id: attemptId,
      mode: "live-room",
      roomId: room.id,
      roomCode: room.roomCode,
      classId: room.classId,
      className: room.className,
      assignmentId: null,
      assignmentTitle: null,
      userId: attemptPayload.userId,
      userDisplayName: attemptPayload.userDisplayName,
      userPhotoURL: attemptPayload.userPhotoURL,
      quizId: attemptPayload.quizId,
      quizSlug: attemptPayload.quizSlug,
      quizTitle: attemptPayload.quizTitle,
      categoryId: attemptPayload.categoryId,
      categoryName: attemptPayload.categoryName,
      difficulty: attemptPayload.difficulty,
      status: "completed",
      score: attemptPayload.score,
      totalPoints: attemptPayload.totalPoints,
      correctCount: attemptPayload.correctCount,
      wrongCount: attemptPayload.wrongCount,
      skippedCount: attemptPayload.skippedCount,
      totalQuestions: attemptPayload.totalQuestions,
      accuracy: attemptPayload.accuracy,
      timeTakenSeconds,
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      answers: attemptAnswers,
      xpEarned: xp.xpEarned,
      levelBefore: xp.levelBefore,
      levelAfter: xp.levelAfter,
      streakAfter: streak.currentStreak,
      badgeUnlocks: badges.newlyEarnedBadges,
      personalBestStatus,
      personalBestDelta,
      leaderboardUpdated: false,
      scoringSource: "client",
      trusted: false,
      attemptSessionId: null,
      securityFlags: [],
      suspiciousScore: 0,
      reviewStatus: "none",
      hiddenFromLeaderboard: false,
      serverScoredAt: null,
      clientReportedTime: timeTakenSeconds,
      serverCalculatedTime: timeTakenSeconds,
      timingDrift: 0,
      createdAt: null,
      updatedAt: null
    };
  });

  if (!alreadySaved && savedAttempt) {
    try {
      await updateLeaderboardsForAttempt(savedAttempt, profile);
      await updateDoc(attemptRef, {
        leaderboardUpdated: true,
        updatedAt: serverTimestamp()
      });
    } catch {
      // Room results remain recoverable; leaderboard entries can be rebuilt later.
    }
  }

  return attemptId;
}

export async function getPreviousBestAttemptForQuiz(userId: string, quizId: string) {
  const snapshot = await getDocs(
    query(
      attemptsCollection(),
      where("userId", "==", userId),
      where("quizId", "==", quizId),
      where("status", "==", "completed"),
      orderBy("completedAt", "desc"),
      limit(50)
    )
  );
  const attempts = snapshot.docs.map(mapAttempt);
  return attempts.reduce<Attempt | null>((best, attempt) => {
    if (!best) return attempt;
    return isBetterAttemptScore(
      {
        score: attempt.score,
        accuracy: attempt.accuracy,
        timeTakenSeconds: attempt.timeTakenSeconds,
        completedAt: attempt.completedAt
      },
      best
    )
      ? attempt
      : best;
  }, null);
}

export async function getAttempt(attemptId: string): Promise<Attempt | null> {
  const snapshot = await getDoc(doc(ensureDb(), "attempts", attemptId));
  return snapshot.exists() ? mapAttempt(snapshot) : null;
}

export async function getAttemptForViewer(
  attemptId: string,
  viewerUid: string,
  isAdmin: boolean
): Promise<Attempt | null | "forbidden"> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return null;
  if (attempt.userId === viewerUid || isAdmin) return attempt;
  return "forbidden";
}

export async function listRecentUserAttempts(userId: string, count = 6): Promise<Attempt[]> {
  const snapshot = await getDocs(
    query(
      attemptsCollection(),
      where("userId", "==", userId),
      orderBy("completedAt", "desc"),
      limit(count)
    )
  );
  return snapshot.docs.map(mapAttempt);
}

export async function listUserQuizAttempts(
  userId: string,
  quizId: string,
  count = 10
): Promise<Attempt[]> {
  const snapshot = await getDocs(
    query(
      attemptsCollection(),
      where("userId", "==", userId),
      where("quizId", "==", quizId),
      orderBy("completedAt", "desc"),
      limit(count)
    )
  );
  return snapshot.docs.map(mapAttempt);
}

export async function listRecentAdminAttempts(count = 50): Promise<Attempt[]> {
  const snapshot = await getDocs(
    query(attemptsCollection(), orderBy("completedAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapAttempt);
}

export async function updateAttemptSecurityReview({
  attemptId,
  reviewStatus,
  hiddenFromLeaderboard,
  adminNote
}: {
  attemptId: string;
  reviewStatus: ReviewStatus;
  hiddenFromLeaderboard?: boolean;
  adminNote?: string;
}) {
  const payload: Record<string, unknown> = {
    reviewStatus,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (typeof hiddenFromLeaderboard === "boolean") {
    payload.hiddenFromLeaderboard = hiddenFromLeaderboard;
  }
  if (adminNote) {
    payload.adminSecurityNote = adminNote.slice(0, 800);
  }
  await updateDoc(doc(ensureDb(), "attempts", attemptId), payload);
}
