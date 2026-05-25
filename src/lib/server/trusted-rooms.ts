import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { getFullRoomQuestions, scoreTrustedRoomAnswer, updateTrustedLeaderboardsForAttempt } from "@/lib/server/trusted-attempts";
import { calculateStreakUpdate, evaluateBadgesForAttempt, normalizeBadges } from "@/lib/quiz/gamification";
import { isSkippedAnswer, scoreQuestionAnswer } from "@/lib/quiz/question-engine";
import { calculateXPForAttempt } from "@/lib/quiz/xp";
import type { Attempt, PersonalBestStatus, Question, QuizAnswerState, SecurityFlag, UserProfile } from "@/types/domain";

type Data = Record<string, unknown>;

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

function asData(value: unknown): Data {
  return value && typeof value === "object" ? (value as Data) : {};
}

function snapshotDataWithId(id: string, value: unknown): Data & { id: string } {
  return { id, ...asData(value) };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function roomPlayerId(roomId: string, userId: string) {
  return `${roomId}_${userId}`;
}

function roomAnswerId(roomId: string, questionIndex: number, userId: string) {
  return `${roomId}_${questionIndex}_${userId}`;
}

function roomResultId(roomId: string, userId: string) {
  return `${roomId}_${userId}`;
}

function activePlayer(data: Data) {
  const status = asString(data.status);
  return status !== "left" && status !== "disconnected";
}

async function isAdmin(decoded: DecodedIdToken) {
  const profileSnapshot = await getAdminDb().collection("users").doc(decoded.uid).get();
  const profile = profileSnapshot.data() ?? {};
  return hasAdminAccess({
    email: decoded.email ?? null,
    profile: {
      email: asString(profile.email, decoded.email ?? ""),
      role: profile.role === "admin" ? "admin" : "user"
    } as never
  });
}

async function assertClassRoomMembership(room: Data, userId: string) {
  if (!asBoolean(room.allowedMemberOnly) || !asString(room.classId)) return;
  const membership = await getAdminDb().collection("classMembers").doc(`${asString(room.classId)}_${userId}`).get();
  if (!membership.exists || membership.data()?.status !== "active") {
    throw new Error("This class room is only open to active class members.");
  }
}

function stableNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) / 4294967295;
}

function wrongOption(question: Question, correctIds: string[]) {
  return question.options.find((option) => !correctIds.includes(option.id))?.id ?? "";
}

function botAccuracy(difficulty: unknown) {
  if (difficulty === "hard") return 0.82;
  if (difficulty === "medium") return 0.62;
  return 0.38;
}

function generateBotAnswer(room: Data & { id: string }, question: Question, bot: Data): QuizAnswerState {
  const shouldBeCorrect =
    stableNumber(`${room.id}:${asNumber(room.currentQuestionIndex)}:${question.id}:${asString(bot.userId)}:correct`) <=
    botAccuracy(bot.botDifficulty);
  if (question.type === "multiple-choice") {
    const correctAnswers = question.correctOptionIds?.length
      ? question.correctOptionIds
      : question.correctAnswers.length
      ? question.correctAnswers
      : question.correctAnswer
        ? [question.correctAnswer]
        : [];
    return {
      selectedAnswer: "",
      selectedAnswers: shouldBeCorrect ? correctAnswers : [wrongOption(question, correctAnswers)].filter(Boolean),
      textAnswer: "",
      timeSpentSeconds: 0
    };
  }
  if (question.type === "text" || question.type === "short-answer") {
    return { selectedAnswer: "", selectedAnswers: [], textAnswer: shouldBeCorrect ? question.correctText || question.correctAnswer : "", timeSpentSeconds: 0 };
  }
  if (question.type === "numeric") {
    return { selectedAnswer: "", selectedAnswers: [], textAnswer: "", numericAnswer: shouldBeCorrect ? String(question.correctNumber ?? "") : "", timeSpentSeconds: 0 };
  }
  if (question.type === "ordering") {
    return { selectedAnswer: "", selectedAnswers: [], textAnswer: "", orderingAnswerIds: shouldBeCorrect ? question.correctOrderIds ?? [] : [], timeSpentSeconds: 0 };
  }
  if (question.type === "matching") {
    const matchingAnswers = shouldBeCorrect
      ? Object.fromEntries((question.matchPairs ?? []).map((pair) => [pair.id, pair.id]))
      : {};
    return { selectedAnswer: "", selectedAnswers: [], textAnswer: "", matchingAnswers, timeSpentSeconds: 0 };
  }
  const correct = question.correctOptionId || question.correctAnswer || question.correctAnswers[0] || "";
  const fallbackWrong = question.type === "true-false" ? (correct === "true" ? "false" : "true") : wrongOption(question, [correct]);
  return { selectedAnswer: shouldBeCorrect ? correct : fallbackWrong, selectedAnswers: [], textAnswer: "", timeSpentSeconds: 0 };
}

function roomAnswerPayload({
  room,
  question,
  questionIndex,
  userId,
  isBot,
  answer,
  pointsEarned,
  pointsPossible,
  isCorrect,
  timeTakenSeconds,
  skipped = false
}: {
  room: Data & { id: string };
  question: Question;
  questionIndex: number;
  userId: string;
  isBot: boolean;
  answer: QuizAnswerState;
  pointsEarned: number;
  pointsPossible: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
  skipped?: boolean;
}) {
  const scored = scoreQuestionAnswer(question, skipped ? undefined : answer);
  return {
    roomId: room.id,
    roomCode: asString(room.roomCode),
    userId,
    isBot,
    questionId: question.id,
    questionIndex,
    questionTextSnapshot: question.questionText,
    type: question.type,
    selectedAnswer: skipped ? "" : scored.selectedAnswer,
    selectedAnswers: skipped ? [] : scored.selectedAnswers,
    correctAnswer: scored.correctAnswer,
    correctAnswers: scored.correctAnswers,
    selectedAnswerSummary: scored.selectedAnswerSummary,
    correctAnswerSummary: scored.correctAnswerSummary,
    textAnswer: skipped ? "" : scored.textAnswer,
    numericAnswer: skipped ? "" : scored.numericAnswer,
    blankAnswers: skipped ? {} : scored.blankAnswers,
    correctBlankAnswers: scored.correctBlankAnswers,
    matchingAnswers: skipped ? {} : scored.matchingAnswers,
    correctMatchingAnswers: scored.correctMatchingAnswers,
    orderingAnswerIds: skipped ? [] : scored.orderingAnswerIds,
    correctOrderIds: scored.correctOrderIds,
    skipped,
    isCorrect,
    pointsEarned,
    pointsPossible,
    timeTakenSeconds,
    explanationSnapshot: "",
    questionImageUrl: question.imageUrl,
    questionImageAlt: question.imageAlt,
    questionImageCaption: question.imageCaption,
    optionsSnapshot: question.options,
    blanksSnapshot: question.blanks,
    matchPairsSnapshot: question.matchPairs,
    orderItemsSnapshot: question.orderItems,
    unit: question.unit,
    tolerance: question.tolerance,
    passageTitle: question.passageTitle,
    passageText: question.passageText,
    assertionText: question.assertionText,
    reasonText: question.reasonText,
    trusted: true,
    scoringSource: "server",
    securityFlags: [] as SecurityFlag[],
    answeredAt: FieldValue.serverTimestamp()
  };
}

export async function submitTrustedRoomAnswer({
  decoded,
  roomId,
  questionIndex,
  answer,
  botUserId
}: {
  decoded: DecodedIdToken;
  roomId: string;
  questionIndex: number;
  answer?: QuizAnswerState;
  botUserId?: string;
}) {
  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnapshot = await roomRef.get();
  if (!roomSnapshot.exists) throw new Error("Room was not found.");
  const room = snapshotDataWithId(roomSnapshot.id, roomSnapshot.data());
  if (asString(room.status) !== "in-progress") throw new Error("This room is not accepting answers.");
  if (asNumber(room.currentQuestionIndex) !== questionIndex) throw new Error("This question has already moved on.");
  await assertClassRoomMembership(room, decoded.uid);

  const targetUserId = botUserId || decoded.uid;
  if (botUserId && asString(room.hostId) !== decoded.uid && !(await isAdmin(decoded))) {
    throw new Error("Only the host can submit bot answers.");
  }
  const playerRef = db.collection("roomPlayers").doc(roomPlayerId(roomId, targetUserId));
  const playerSnapshot = await playerRef.get();
  if (!playerSnapshot.exists) throw new Error("You are not joined to this room.");
  const player = playerSnapshot.data() ?? {};
  if (!activePlayer(player)) throw new Error("This player is not active in the room.");
  if (!botUserId && asString(player.userId) !== decoded.uid) throw new Error("You can only submit your own answer.");
  if (botUserId && !asBoolean(player.isBot)) throw new Error("The selected player is not a bot.");

  const questions = await getFullRoomQuestions(room);
  const question = questions[questionIndex];
  if (!question) throw new Error("Room question was not found.");
  const finalAnswer = botUserId ? generateBotAnswer(room, question, player) : answer;
  if (!finalAnswer) throw new Error("Answer payload is required.");
  const scored = await scoreTrustedRoomAnswer({ room, question, answer: finalAnswer });
  const answerRef = db.collection("roomAnswers").doc(roomAnswerId(roomId, questionIndex, targetUserId));

  await db.runTransaction(async (transaction) => {
    const [freshRoomSnapshot, freshPlayerSnapshot, existingAnswer] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(playerRef),
      transaction.get(answerRef)
    ]);
    if (!freshRoomSnapshot.exists || !freshPlayerSnapshot.exists) throw new Error("Room state changed.");
    const freshRoom = freshRoomSnapshot.data() ?? {};
    const freshPlayer = freshPlayerSnapshot.data() ?? {};
    if (asString(freshRoom.status) !== "in-progress") throw new Error("This room is not accepting answers.");
    if (asNumber(freshRoom.currentQuestionIndex) !== questionIndex) throw new Error("This question has already moved on.");
    if (existingAnswer.exists) throw new Error("This answer is already submitted.");
    transaction.set(
      answerRef,
      roomAnswerPayload({
        room,
        question,
        questionIndex,
        userId: targetUserId,
        isBot: asBoolean(freshPlayer.isBot),
        answer: finalAnswer,
        pointsEarned: scored.pointsEarned,
        pointsPossible: scored.pointsPossible,
        isCorrect: scored.isCorrect,
        timeTakenSeconds: scored.timeTakenSeconds
      })
    );
    transaction.update(playerRef, {
      status: "submitted",
      currentAnswerStatus: "submitted",
      score: asNumber(freshPlayer.score) + scored.pointsEarned,
      correctCount: asNumber(freshPlayer.correctCount) + (scored.isCorrect ? 1 : 0),
      wrongCount:
        asNumber(freshPlayer.wrongCount) +
        (!scored.isCorrect && !isSkippedAnswer(finalAnswer, question) ? 1 : 0),
      lastSeenAt: FieldValue.serverTimestamp()
    });
  });
}

export async function finalizeTrustedRoomQuestion({ decoded, roomId }: { decoded: DecodedIdToken; roomId: string }) {
  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnapshot = await roomRef.get();
  if (!roomSnapshot.exists) throw new Error("Room was not found.");
  const room = snapshotDataWithId(roomSnapshot.id, roomSnapshot.data());
  if (asString(room.hostId) !== decoded.uid && !(await isAdmin(decoded))) throw new Error("Only the host can advance this room.");
  if (asString(room.status) !== "in-progress") throw new Error("Only active rooms can advance.");
  const questionIndex = asNumber(room.currentQuestionIndex);
  const questions = await getFullRoomQuestions(room);
  const question = questions[questionIndex];
  if (!question) throw new Error("Current room question is missing.");
  const playersSnapshot = await db.collection("roomPlayers").where("roomId", "==", roomId).get();
  const players = playersSnapshot.docs.map((docSnapshot) => snapshotDataWithId(docSnapshot.id, docSnapshot.data()));
  const activePlayers = players.filter(activePlayer);

  await db.runTransaction(async (transaction) => {
    const answerSnapshots = await Promise.all(
      activePlayers.map((player) => transaction.get(db.collection("roomAnswers").doc(roomAnswerId(roomId, questionIndex, asString(player.userId)))))
    );
    activePlayers.forEach((player, index) => {
      if (answerSnapshots[index].exists) return;
      const answerRef = db.collection("roomAnswers").doc(roomAnswerId(roomId, questionIndex, asString(player.userId)));
      const playerRef = db.collection("roomPlayers").doc(asString(player.id));
      const skipped: QuizAnswerState = { selectedAnswer: "", selectedAnswers: [], textAnswer: "", timeSpentSeconds: asNumber((room.settings as Data)?.questionTimerSeconds, 30) };
      transaction.set(
        answerRef,
        roomAnswerPayload({
          room,
          question,
          questionIndex,
          userId: asString(player.userId),
          isBot: asBoolean(player.isBot),
          answer: skipped,
          pointsEarned: 0,
          pointsPossible: question.points,
          isCorrect: false,
          timeTakenSeconds: skipped.timeSpentSeconds,
          skipped: true
        })
      );
      transaction.update(playerRef, {
        skippedCount: asNumber(player.skippedCount) + 1,
        currentAnswerStatus: "skipped",
        lastSeenAt: FieldValue.serverTimestamp()
      });
    });

    const finalQuestion = questionIndex >= questions.length - 1;
    if (!finalQuestion) {
      const now = new Date();
      transaction.update(roomRef, {
        currentQuestionIndex: questionIndex + 1,
        questionStartedAt: now,
        questionEndsAt: new Date(now.getTime() + asNumber((room.settings as Data)?.questionTimerSeconds, 30) * 1000),
        updatedAt: FieldValue.serverTimestamp()
      });
      activePlayers.forEach((player) => {
        transaction.update(db.collection("roomPlayers").doc(asString(player.id)), {
          status: "playing",
          currentAnswerStatus: "idle",
          lastSeenAt: FieldValue.serverTimestamp()
        });
      });
      return;
    }

    const completedAt = new Date();
    const ranked = [...activePlayers]
      .sort((first, second) => {
        if (asNumber(second.score) !== asNumber(first.score)) return asNumber(second.score) - asNumber(first.score);
        if (asNumber(second.correctCount) !== asNumber(first.correctCount)) return asNumber(second.correctCount) - asNumber(first.correctCount);
        return asNumber(first.wrongCount) - asNumber(second.wrongCount);
      })
      .map((player, index) => ({ player, rank: index + 1 }));
    ranked.forEach(({ player, rank }) => {
      const totalQuestions = questions.length;
      const accuracy = totalQuestions ? Math.round((asNumber(player.correctCount) / totalQuestions) * 100) : 0;
      transaction.set(
        db.collection("roomResults").doc(roomResultId(roomId, asString(player.userId))),
        {
          roomId,
          roomCode: asString(room.roomCode),
          userId: asString(player.userId),
          displayName: asString(player.displayName, "Quizora Player"),
          photoURL: asString(player.photoURL) || null,
          isBot: asBoolean(player.isBot),
          botDifficulty: asString(player.botDifficulty) || null,
          score: asNumber(player.score),
          totalPoints: asNumber(room.totalPoints),
          accuracy,
          correctCount: asNumber(player.correctCount),
          wrongCount: asNumber(player.wrongCount),
          skippedCount: asNumber(player.skippedCount),
          rank,
          xpEarned: asBoolean(player.isBot) ? 0 : Math.max(5, Math.round(asNumber(player.score) / 2)),
          attemptId: null,
          trusted: true,
          scoringSource: "server",
          securityFlags: [],
          reviewStatus: "none",
          completedAt,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      transaction.update(db.collection("roomPlayers").doc(asString(player.id)), {
        status: "submitted",
        completedAt,
        lastSeenAt: FieldValue.serverTimestamp()
      });
    });
    transaction.update(roomRef, {
      status: "completed",
      completedAt,
      leaderboardMode: "trusted",
      antiAbuse: {
        ...(room.antiAbuse as Data),
        clientScored: false
      },
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { completed: questionIndex >= questions.length - 1 };
}

async function getPreviousBest(userId: string, quizId: string) {
  const snapshot = await getAdminDb()
    .collection("attempts")
    .where("userId", "==", userId)
    .where("quizId", "==", quizId)
    .where("status", "==", "completed")
    .orderBy("completedAt", "desc")
    .limit(50)
    .get();
  return snapshot.docs.map((docSnapshot) => docSnapshot.data()).reduce<null | Data>((best, attempt) => {
    if (!best) return attempt;
    if (asNumber(attempt.score) !== asNumber(best.score)) return asNumber(attempt.score) > asNumber(best.score) ? attempt : best;
    return asNumber(attempt.timeTakenSeconds) < asNumber(best.timeTakenSeconds) ? attempt : best;
  }, null);
}

export async function ensureTrustedRoomAttempt({ decoded, roomId }: { decoded: DecodedIdToken; roomId: string }) {
  const db = getAdminDb();
  const [roomSnapshot, resultSnapshot, userSnapshot] = await Promise.all([
    db.collection("rooms").doc(roomId).get(),
    db.collection("roomResults").doc(roomResultId(roomId, decoded.uid)).get(),
    db.collection("users").doc(decoded.uid).get()
  ]);
  if (!roomSnapshot.exists) throw new Error("Room was not found.");
  if (!resultSnapshot.exists) throw new Error("Your room result is not ready yet.");
  const room = snapshotDataWithId(roomSnapshot.id, roomSnapshot.data());
  const result = asData(resultSnapshot.data());
  if (asBoolean(result.isBot)) throw new Error("Bot results do not create profile attempts.");
  if (asString(result.attemptId)) return asString(result.attemptId);

  const questions = await getFullRoomQuestions(room);
  const answersSnapshot = await db
    .collection("roomAnswers")
    .where("roomId", "==", roomId)
    .where("userId", "==", decoded.uid)
    .orderBy("questionIndex", "asc")
    .get();
  const answersByQuestion = new Map(answersSnapshot.docs.map((docSnapshot) => [asString(docSnapshot.data().questionId), docSnapshot.data()]));
  const attemptAnswers = questions.map((question) => {
    const answer = answersByQuestion.get(question.id) ?? {};
    const answerState: QuizAnswerState = {
      selectedAnswer: asString(answer.selectedAnswer),
      selectedAnswers: asStringArray(answer.selectedAnswers),
      textAnswer: asString(answer.textAnswer, question.type === "text" ? asString(answer.selectedAnswer) : ""),
      numericAnswer: asString(answer.numericAnswer),
      blankAnswers: asData(answer.blankAnswers) as Record<string, string>,
      matchingAnswers: asData(answer.matchingAnswers) as Record<string, string>,
      orderingAnswerIds: asStringArray(answer.orderingAnswerIds),
      timeSpentSeconds: asNumber(answer.timeTakenSeconds)
    };
    const scored = scoreQuestionAnswer(question, answerState);
    return {
      questionId: question.id,
      questionTextSnapshot: question.questionText,
      type: question.type,
      selectedAnswer: scored.selectedAnswer,
      selectedAnswers: scored.selectedAnswers,
      correctAnswer: scored.correctAnswer,
      correctAnswers: scored.correctAnswers,
      selectedAnswerSummary: scored.selectedAnswerSummary,
      correctAnswerSummary: scored.correctAnswerSummary,
      textAnswer: scored.textAnswer,
      numericAnswer: scored.numericAnswer,
      blankAnswers: scored.blankAnswers,
      correctBlankAnswers: scored.correctBlankAnswers,
      matchingAnswers: scored.matchingAnswers,
      correctMatchingAnswers: scored.correctMatchingAnswers,
      orderingAnswerIds: scored.orderingAnswerIds,
      correctOrderIds: scored.correctOrderIds,
      skipped: scored.skipped,
      isCorrect: scored.isCorrect,
      pointsEarned: scored.pointsEarned,
      pointsPossible: question.points,
      timeSpentSeconds: answerState.timeSpentSeconds,
      explanationSnapshot: question.explanation,
      questionImageUrl: question.imageUrl,
      questionImageAlt: question.imageAlt,
      questionImageCaption: question.imageCaption,
      optionsSnapshot: question.options,
      blanksSnapshot: question.blanks,
      matchPairsSnapshot: question.matchPairs,
      orderItemsSnapshot: question.orderItems,
      unit: question.unit,
      tolerance: question.tolerance,
      passageTitle: question.passageTitle,
      passageText: question.passageText,
      assertionText: question.assertionText,
      reasonText: question.reasonText
    };
  });
  const completedAt = toDate(result.completedAt) ?? new Date();
  const startedAt = toDate(room.startedAt) ?? new Date(completedAt.getTime() - attemptAnswers.reduce((sum, item) => sum + item.timeSpentSeconds, 0) * 1000);
  const timeTakenSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
  const userData = userSnapshot.data() ?? {};
  const previousBest = await getPreviousBest(decoded.uid, asString(room.quizId));
  const personalBestStatus: PersonalBestStatus = !previousBest
    ? "first"
    : asNumber(result.score) > asNumber(previousBest.score)
      ? "new-best"
      : asNumber(result.score) === asNumber(previousBest.score)
        ? "matched"
        : "below-best";
  const nextPlayed = asNumber(userData.totalQuizzesPlayed) + 1;
  const currentAverage = asNumber(userData.averageAccuracy);
  const nextAverage = Math.round(((currentAverage * asNumber(userData.totalQuizzesPlayed) + asNumber(result.accuracy)) / nextPlayed) * 10) / 10;
  const streak = calculateStreakUpdate({
    lastPlayedDate: asString(userData.lastPlayedDate) || null,
    currentStreak: asNumber(userData.currentStreak),
    longestStreak: asNumber(userData.longestStreak),
    now: completedAt
  });
  const badges = evaluateBadgesForAttempt({
    attempt: {
      score: asNumber(result.score),
      totalPoints: asNumber(result.totalPoints),
      accuracy: asNumber(result.accuracy),
      timeTakenSeconds,
      totalQuestions: questions.length
    },
    profile: { earnedBadges: normalizeBadges(userData.earnedBadges) } as UserProfile,
    nextTotalPlayed: nextPlayed,
    streakAfter: streak.currentStreak,
    categoryIdsPlayed: Array.from(new Set([...asStringArray(userData.categoryIdsPlayed), asString(room.categoryId)].filter(Boolean))),
    personalBestStatus,
    now: completedAt
  });
  const xp = calculateXPForAttempt({
    score: asNumber(result.score),
    accuracy: asNumber(result.accuracy),
    currentXp: asNumber(userData.xp),
    timeTakenSeconds,
    totalQuestions: questions.length,
    streakAfter: streak.currentStreak,
    personalBestStatus
  });
  const attemptId = `live_${roomId}_${decoded.uid}`;
  const attemptRef = db.collection("attempts").doc(attemptId);
  const displayName = asString(userData.displayName, decoded.name ?? decoded.email ?? "Quizora Player");
  const photoURL = asString(userData.photoURL, decoded.picture ?? "") || null;
  const attempt: Attempt = {
    id: attemptId,
    mode: "live-room",
    roomId,
    roomCode: asString(room.roomCode),
    classId: asString(room.classId) || null,
    className: asString(room.className) || null,
    assignmentId: null,
    assignmentTitle: null,
    userId: decoded.uid,
    userDisplayName: displayName,
    userPhotoURL: photoURL,
    quizId: asString(room.quizId),
    quizSlug: asString(room.quizSlug),
    quizTitle: asString(room.quizTitle),
    categoryId: asString(room.categoryId),
    categoryName: asString(room.categoryName, "Uncategorized"),
    difficulty: room.difficulty === "medium" || room.difficulty === "hard" || room.difficulty === "expert" ? room.difficulty : "easy",
    status: "completed",
    score: asNumber(result.score),
    totalPoints: asNumber(result.totalPoints),
    correctCount: asNumber(result.correctCount),
    wrongCount: asNumber(result.wrongCount),
    skippedCount: asNumber(result.skippedCount),
    totalQuestions: questions.length,
    accuracy: asNumber(result.accuracy),
    timeTakenSeconds,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    answers: attemptAnswers,
    xpEarned: xp.xpEarned,
    levelBefore: xp.levelBefore,
    levelAfter: xp.levelAfter,
    streakAfter: streak.currentStreak,
    badgeUnlocks: badges.newlyEarnedBadges,
    personalBestStatus,
    personalBestDelta: asNumber(result.score) - asNumber(previousBest?.score),
    leaderboardUpdated: false,
    scoringSource: "server",
    trusted: true,
    attemptSessionId: null,
    securityFlags: [],
    suspiciousScore: 0,
    reviewStatus: "none",
    hiddenFromLeaderboard: false,
    serverScoredAt: completedAt.toISOString(),
    clientReportedTime: null,
    serverCalculatedTime: timeTakenSeconds,
    timingDrift: 0,
    createdAt: null,
    updatedAt: null
  };

  await attemptRef.set({
    ...attempt,
    startedAt,
    completedAt,
    serverScoredAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await db.collection("roomResults").doc(roomResultId(roomId, decoded.uid)).set({ attemptId, xpEarned: xp.xpEarned, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("users").doc(decoded.uid).set({
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
    categoryIdsPlayed: Array.from(new Set([...asStringArray(userData.categoryIdsPlayed), asString(room.categoryId)].filter(Boolean))),
    lastActiveAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await updateTrustedLeaderboardsForAttempt(attempt);
  await attemptRef.set({ leaderboardUpdated: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return attemptId;
}
