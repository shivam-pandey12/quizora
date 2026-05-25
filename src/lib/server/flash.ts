import "server-only";

import crypto from "node:crypto";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getEffectivePlanForUser } from "@/lib/billing/server";
import { getFlashQuizLimits } from "@/lib/flash/limits";
import {
  flashAnswerId,
  flashCodeAlphabet,
  flashPlayerId,
  flashResultId,
  normalizeFlashCode,
  safeFlashQuestion,
  scoreFlashAnswer
} from "@/lib/flash/shared";
import {
  flashQuestionTypes,
  normalizeOptions,
  normalizeQuestionType,
  validateQuestionByType
} from "@/lib/quiz/question-engine";
import type { FlashLimits, FlashQuestion, QuizAnswerState, QuestionOption, UserProfile } from "@/types/domain";

type Data = Record<string, unknown>;

interface FlashQuestionDraft {
  questionText?: unknown;
  type?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  correctAnswers?: unknown;
  correctText?: unknown;
  acceptableAnswers?: unknown;
  explanation?: unknown;
  points?: unknown;
  timeLimitSeconds?: unknown;
}

interface FlashCreateBody {
  title?: unknown;
  description?: unknown;
  mode?: unknown;
  expiryHours?: unknown;
  maxPlayers?: unknown;
  questionTimerSeconds?: unknown;
  leaderboardMode?: unknown;
  showAnswersAfterEach?: unknown;
  settings?: unknown;
  questions?: unknown;
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

function asData(value: unknown): Data {
  return value && typeof value === "object" ? (value as Data) : {};
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

function snapshotData(id: string, data: unknown): Data & { id: string } {
  return { id, ...asData(data) };
}

function optionList(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const option = asData(item);
      const id = asString(option.id, `option-${index + 1}`).trim();
      const text = asString(option.text).trim();
      return { id, text };
    })
    .filter((option) => option.id && option.text)
    .slice(0, 8);
}

function isAdminProfile(data: Data, decoded: DecodedIdToken) {
  return data.role === "admin" || (decoded.email && asString(data.email) === decoded.email && data.role === "admin");
}

async function getUserProfile(decoded: DecodedIdToken) {
  const snapshot = await getAdminDb().collection("users").doc(decoded.uid).get();
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    data,
    displayName: asString(data.displayName, decoded.name ?? decoded.email ?? "Quizora Player"),
    email: asString(data.email, decoded.email ?? ""),
    photoURL: asString(data.photoURL, decoded.picture ?? "") || null,
    isAdmin: isAdminProfile(data, decoded),
    creatorStatus: asString(data.creatorStatus, "none")
  };
}

async function getLimits(decoded: DecodedIdToken) {
  const profile = await getUserProfile(decoded);
  const plan = profile.isAdmin ? null : await getEffectivePlanForUser(decoded.uid);
  const limits = getFlashQuizLimits(plan, {
    uid: decoded.uid,
    role: profile.isAdmin ? "admin" : "user",
    creatorStatus: profile.creatorStatus
  } as UserProfile);
  return { profile, limits };
}

function createCode() {
  const bytes = crypto.randomBytes(8);
  return Array.from({ length: 6 }, (_, index) => flashCodeAlphabet[bytes[index] % flashCodeAlphabet.length]).join("");
}

async function uniqueFlashCode() {
  const db = getAdminDb();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const flashCode = createCode();
    const snapshot = await db.collection("flashQuizzes").where("flashCode", "==", flashCode).limit(1).get();
    if (snapshot.empty) return flashCode;
  }
  throw new Error("Could not create a unique Flash Code. Try again.");
}

function validateQuestion(input: FlashQuestionDraft, order: number, flashQuizId: string): Omit<FlashQuestion, "id" | "createdAt" | "updatedAt"> {
  const questionText = asString(input.questionText).trim();
  const requestedType = normalizeQuestionType(input.type);
  const type = flashQuestionTypes.includes(requestedType) ? requestedType : "single-choice";
  const options =
    type === "true-false"
      ? [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ]
      : type === "short-answer" || type === "text"
        ? []
      : optionList(input.options);
  const correctAnswer = asString(input.correctAnswer).trim();
  const correctAnswers = asStringArray(input.correctAnswers).map((item) => item.trim()).filter(Boolean);
  const correctText = asString(input.correctText, correctAnswer).trim();
  const acceptableAnswers = asStringArray(input.acceptableAnswers).map((item) => item.trim()).filter(Boolean);
  const explanation = asString(input.explanation).trim();
  const points = Math.max(1, Math.min(20, Math.round(asNumber(input.points, 1))));
  const timeLimitSeconds = Math.max(10, Math.min(180, Math.round(asNumber(input.timeLimitSeconds, 30))));
  const optionIds = new Set(options.map((option) => option.id));

  if (!questionText || questionText.length < 8) throw new Error(`Question ${order + 1} needs clearer text.`);
  if (type !== "short-answer" && type !== "text" && options.length < 2) throw new Error(`Question ${order + 1} needs at least two options.`);
  if (!explanation || explanation.length < 8) throw new Error(`Question ${order + 1} needs a short explanation.`);
  if (type === "multiple-choice") {
    if (!correctAnswers.length || !correctAnswers.every((answer) => optionIds.has(answer))) {
      throw new Error(`Question ${order + 1} has invalid correct answers.`);
    }
  } else if (type === "short-answer" || type === "text") {
    if (!correctText && !acceptableAnswers.length) throw new Error(`Question ${order + 1} needs an accepted short answer.`);
  } else if (!correctAnswer || !optionIds.has(correctAnswer)) {
    throw new Error(`Question ${order + 1} has an invalid correct answer.`);
  }
  const validation = validateQuestionByType(
    {
      id: "",
      quizId: flashQuizId,
      flashQuizId,
      questionText,
      type,
      options,
      correctAnswer: type === "multiple-choice" ? "" : correctAnswer || correctText,
      correctAnswers: type === "multiple-choice" ? correctAnswers : correctAnswer ? [correctAnswer] : [],
      correctText,
      acceptableAnswers,
      explanation,
      points,
      timeLimitSeconds,
      order,
      status: "active",
      createdAt: null,
      updatedAt: null
    },
    { maxOptions: 8 }
  );
  if (!validation.valid) throw new Error(`Question ${order + 1}: ${Object.values(validation.errors)[0]}`);

  return {
    flashQuizId,
    questionText,
    type,
    options,
    correctAnswer: type === "multiple-choice" ? "" : type === "short-answer" || type === "text" ? correctText : correctAnswer,
    correctAnswers: type === "multiple-choice" ? correctAnswers : correctAnswer ? [correctAnswer] : [],
    correctOptionId: type === "multiple-choice" || type === "short-answer" || type === "text" ? "" : correctAnswer,
    correctOptionIds: type === "multiple-choice" ? correctAnswers : [],
    correctText,
    acceptableAnswers,
    caseSensitive: false,
    trimWhitespace: true,
    explanation,
    points,
    timeLimitSeconds,
    order,
    status: "active"
  };
}

function validateCreateBody(body: FlashCreateBody, limits: FlashLimits, flashQuizId: string) {
  const title = asString(body.title).trim();
  const description = asString(body.description).trim();
  const mode = body.mode === "self-paced" ? "self-paced" : "live";
  const expiryHours = Math.max(1, Math.min(limits.maxExpiryHours, Math.round(asNumber(body.expiryHours, 1))));
  const maxPlayers = Math.max(1, Math.min(limits.maxPlayers, Math.round(asNumber(body.maxPlayers, limits.maxPlayers))));
  const questionTimerSeconds = Math.max(10, Math.min(180, Math.round(asNumber(body.questionTimerSeconds, 30))));
  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];

  if (!title || title.length < 4) throw new Error("Flash Quiz title is required.");
  if (title.length > 120) throw new Error("Flash Quiz title is too long.");
  if (description.length > 800) throw new Error("Description is too long.");
  if (rawQuestions.length < 3) throw new Error("Add at least 3 questions before creating a Flash Quiz.");
  if (rawQuestions.length > limits.maxQuestions) {
    throw new Error(`Your plan supports up to ${limits.maxQuestions} Flash Quiz questions.`);
  }

  const questions = rawQuestions.map((item, index) => validateQuestion(asData(item), index, flashQuizId));
  const settings = asData(body.settings);
  return {
    title,
    description,
    mode,
    expiryHours,
    maxPlayers,
    questionTimerSeconds,
    leaderboardMode: body.leaderboardMode === "score-speed" ? "score-speed" : "score",
    showAnswersAfterEach: asBoolean(body.showAnswersAfterEach),
    settings: {
      shuffleQuestions: asBoolean(settings.shuffleQuestions),
      shuffleOptions: asBoolean(settings.shuffleOptions),
      showCorrectAfterEachQuestion: asBoolean(settings.showCorrectAfterEachQuestion),
      allowLateJoin: asBoolean(settings.allowLateJoin, true),
      autoAdvance: asBoolean(settings.autoAdvance),
      requireLogin: true,
      allowRetake: mode === "self-paced" && asBoolean(settings.allowRetake),
      maxAttemptsPerPlayer: 1,
      showLeaderboardDuringPlay: asBoolean(settings.showLeaderboardDuringPlay, true),
      showLeaderboardAfterFinish: asBoolean(settings.showLeaderboardAfterFinish, true)
    },
    questions,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0)
  };
}

async function getFlashQuiz(flashQuizId: string) {
  const snapshot = await getAdminDb().collection("flashQuizzes").doc(flashQuizId).get();
  if (!snapshot.exists) throw new Error("Flash Quiz was not found.");
  return snapshotData(snapshot.id, snapshot.data());
}

async function getFlashQuizByCode(flashCode: string) {
  const normalized = normalizeFlashCode(flashCode);
  if (!normalized) throw new Error("Enter a valid Flash Code.");
  const snapshot = await getAdminDb().collection("flashQuizzes").where("flashCode", "==", normalized).limit(1).get();
  if (snapshot.empty) throw new Error("No Flash Quiz was found for that code.");
  return snapshotData(snapshot.docs[0].id, snapshot.docs[0].data());
}

function assertNotExpired(flashQuiz: Data) {
  const expiresAt = toDate(flashQuiz.expiresAt);
  if (asString(flashQuiz.status) === "expired" || (expiresAt && expiresAt.getTime() <= Date.now())) {
    throw new Error("This Flash Quiz has expired.");
  }
}

async function assertHostOrAdmin(flashQuiz: Data, decoded: DecodedIdToken) {
  if (asString(flashQuiz.hostId) === decoded.uid) return;
  const profile = await getUserProfile(decoded);
  if (profile.isAdmin) return;
  throw new Error("Only the host can manage this Flash Quiz.");
}

function activePlayer(data: Data) {
  const status = asString(data.status);
  return status !== "left" && status !== "disconnected";
}

export async function getFullFlashQuestions(flashQuizId: string) {
  const snapshot = await getAdminDb()
    .collection("flashQuestions")
    .where("flashQuizId", "==", flashQuizId)
    .where("status", "==", "active")
    .orderBy("order", "asc")
    .get();
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      flashQuizId: asString(data.flashQuizId),
      questionText: asString(data.questionText),
      type: flashQuestionTypes.includes(normalizeQuestionType(data.type)) ? normalizeQuestionType(data.type) : "single-choice",
      options: normalizeOptions(data.options, 0),
      correctAnswer: asString(data.correctAnswer),
      correctAnswers: asStringArray(data.correctAnswers),
      correctOptionId: asString(data.correctOptionId, asString(data.correctAnswer)),
      correctOptionIds: asStringArray(data.correctOptionIds).length
        ? asStringArray(data.correctOptionIds)
        : asStringArray(data.correctAnswers),
      correctText: asString(data.correctText, asString(data.correctAnswer)),
      acceptableAnswers: asStringArray(data.acceptableAnswers),
      caseSensitive: asBoolean(data.caseSensitive),
      trimWhitespace: asBoolean(data.trimWhitespace, true),
      explanation: asString(data.explanation),
      points: asNumber(data.points, 1),
      timeLimitSeconds: asNumber(data.timeLimitSeconds, 30),
      order: asNumber(data.order),
      status: data.status === "hidden" ? "hidden" : "active",
      createdAt: null,
      updatedAt: null
    } satisfies FlashQuestion;
  });
}

async function activeFlashCount(hostId: string) {
  const snapshot = await getAdminDb()
    .collection("flashQuizzes")
    .where("hostId", "==", hostId)
    .orderBy("createdAt", "desc")
    .limit(40)
    .get();
  const now = Date.now();
  return snapshot.docs.filter((docSnapshot) => {
    const data = docSnapshot.data();
    const status = asString(data.status);
    const expiresAt = toDate(data.expiresAt);
    return (status === "active" || status === "running") && (!expiresAt || expiresAt.getTime() > now);
  }).length;
}

export async function createFlashQuizServer(decoded: DecodedIdToken, body: FlashCreateBody) {
  const db = getAdminDb();
  const { profile, limits } = await getLimits(decoded);
  if ((await activeFlashCount(decoded.uid)) >= limits.maxActiveFlashQuizzes) {
    throw new Error(`Your plan supports ${limits.maxActiveFlashQuizzes} active Flash Quizzes at a time.`);
  }

  const flashQuizRef = db.collection("flashQuizzes").doc();
  const input = validateCreateBody(body, limits, flashQuizRef.id);
  const flashCode = await uniqueFlashCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.expiryHours * 60 * 60 * 1000);
  const batch = db.batch();

  batch.set(flashQuizRef, {
    flashCode,
    title: input.title,
    description: input.description,
    hostId: decoded.uid,
    hostName: profile.displayName,
    hostPhotoURL: profile.photoURL,
    mode: input.mode,
    status: "active",
    visibility: "link-only",
    expiryHours: input.expiryHours,
    expiresAt: Timestamp.fromDate(expiresAt),
    startedAt: null,
    endedAt: null,
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionEndsAt: null,
    questionCount: input.questions.length,
    totalPoints: input.totalPoints,
    maxPlayers: input.maxPlayers,
    playerCount: 1,
    allowGuests: false,
    showAnswersAfterEach: input.showAnswersAfterEach,
    leaderboardMode: input.leaderboardMode,
    questionTimerSeconds: input.questionTimerSeconds,
    lockAfterStart: true,
    isPremiumExtended: false,
    extensionCount: 0,
    source: "flash",
    convertedQuizId: null,
    antiAbuse: {
      duplicateAnswerAttempts: 0,
      failedJoinAttempts: 0,
      reportCount: 0,
      flags: []
    },
    settings: input.settings,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  input.questions.forEach((question, index) => {
    batch.set(db.collection("flashQuestions").doc(`${flashQuizRef.id}_${index}`), {
      ...question,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  batch.set(db.collection("flashPlayers").doc(flashPlayerId(flashQuizRef.id, decoded.uid)), {
    flashQuizId: flashQuizRef.id,
    flashCode,
    userId: decoded.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    role: "host",
    isGuest: false,
    status: "ready",
    score: 0,
    accuracy: 0,
    rank: 1,
    previousRank: 1,
    rankDelta: 0,
    correctCount: 0,
    wrongCount: 0,
    skippedCount: 0,
    totalTimeSeconds: 0,
    joinedAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
    completedAt: null
  });

  await batch.commit();
  return { flashQuizId: flashQuizRef.id, flashCode, hostPath: `/flash/${flashCode}/host` };
}

export async function joinFlashQuizServer(decoded: DecodedIdToken, flashCode: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuizByCode(flashCode);
  assertNotExpired(flashQuiz);
  const status = asString(flashQuiz.status);
  if (status === "ended" || status === "archived") throw new Error("This Flash Quiz is closed.");
  if (status === "running" && asData(flashQuiz.settings).allowLateJoin !== true && asString(flashQuiz.hostId) !== decoded.uid) {
    throw new Error("This Flash Quiz has already started.");
  }
  const profile = await getUserProfile(decoded);
  const playerRef = db.collection("flashPlayers").doc(flashPlayerId(flashQuiz.id, decoded.uid));
  const flashQuizRef = db.collection("flashQuizzes").doc(flashQuiz.id);

  await db.runTransaction(async (transaction) => {
    const [freshQuizSnapshot, existingPlayer] = await Promise.all([
      transaction.get(flashQuizRef),
      transaction.get(playerRef)
    ]);
    if (!freshQuizSnapshot.exists) throw new Error("Flash Quiz was not found.");
    const freshQuiz = snapshotData(freshQuizSnapshot.id, freshQuizSnapshot.data());
    assertNotExpired(freshQuiz);
    if (existingPlayer.exists) {
      transaction.update(playerRef, {
        status: asString(freshQuiz.status) === "running" ? "playing" : "joined",
        lastActiveAt: FieldValue.serverTimestamp()
      });
      return;
    }
    if (asNumber(freshQuiz.playerCount) >= asNumber(freshQuiz.maxPlayers, 10)) {
      throw new Error("This Flash Quiz is full.");
    }
    const nextCount = asNumber(freshQuiz.playerCount) + 1;
    transaction.set(playerRef, {
      flashQuizId: freshQuiz.id,
      flashCode: asString(freshQuiz.flashCode),
      userId: decoded.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      role: asString(freshQuiz.hostId) === decoded.uid ? "host" : "player",
      isGuest: false,
      status: asString(freshQuiz.status) === "running" ? "playing" : "joined",
      score: 0,
      accuracy: 0,
      rank: nextCount,
      previousRank: nextCount,
      rankDelta: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      totalTimeSeconds: 0,
      joinedAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
      completedAt: null
    });
    transaction.update(flashQuizRef, {
      playerCount: nextCount,
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return {
    flashQuizId: flashQuiz.id,
    flashCode: asString(flashQuiz.flashCode),
    playPath: `/flash/${asString(flashQuiz.flashCode)}/play`,
    hostPath: asString(flashQuiz.hostId) === decoded.uid ? `/flash/${asString(flashQuiz.flashCode)}/host` : undefined
  };
}

function publicFlashQuiz(data: Data & { id: string }) {
  return {
    id: data.id,
    flashCode: asString(data.flashCode),
    title: asString(data.title, "Untitled Flash Quiz"),
    description: asString(data.description),
    hostId: asString(data.hostId),
    hostName: asString(data.hostName, "Quizora Host"),
    hostPhotoURL: asString(data.hostPhotoURL) || null,
    mode: asString(data.mode) === "self-paced" ? "self-paced" : "live",
    status: asString(data.status, "active"),
    visibility: "link-only",
    expiryHours: asNumber(data.expiryHours, 1),
    expiresAt: toDate(data.expiresAt)?.toISOString() ?? null,
    createdAt: toDate(data.createdAt)?.toISOString() ?? null,
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? null,
    startedAt: toDate(data.startedAt)?.toISOString() ?? null,
    endedAt: toDate(data.endedAt)?.toISOString() ?? null,
    currentQuestionIndex: asNumber(data.currentQuestionIndex),
    questionStartedAt: toDate(data.questionStartedAt)?.toISOString() ?? null,
    questionEndsAt: toDate(data.questionEndsAt)?.toISOString() ?? null,
    questionCount: asNumber(data.questionCount),
    totalPoints: asNumber(data.totalPoints),
    maxPlayers: asNumber(data.maxPlayers, 10),
    playerCount: asNumber(data.playerCount),
    allowGuests: false,
    showAnswersAfterEach: asBoolean(data.showAnswersAfterEach),
    leaderboardMode: asString(data.leaderboardMode) === "score-speed" ? "score-speed" : "score",
    questionTimerSeconds: asNumber(data.questionTimerSeconds, 30),
    lockAfterStart: asBoolean(data.lockAfterStart, true),
    isPremiumExtended: asBoolean(data.isPremiumExtended),
    extensionCount: asNumber(data.extensionCount),
    source: "flash",
    convertedQuizId: asString(data.convertedQuizId) || null,
    antiAbuse: {
      duplicateAnswerAttempts: asNumber(asData(data.antiAbuse).duplicateAnswerAttempts),
      failedJoinAttempts: asNumber(asData(data.antiAbuse).failedJoinAttempts),
      reportCount: asNumber(asData(data.antiAbuse).reportCount),
      flags: asStringArray(asData(data.antiAbuse).flags)
    },
    settings: {
      shuffleQuestions: asBoolean(asData(data.settings).shuffleQuestions),
      shuffleOptions: asBoolean(asData(data.settings).shuffleOptions),
      showCorrectAfterEachQuestion: asBoolean(asData(data.settings).showCorrectAfterEachQuestion),
      allowLateJoin: asBoolean(asData(data.settings).allowLateJoin, true),
      autoAdvance: asBoolean(asData(data.settings).autoAdvance),
      requireLogin: true,
      allowRetake: asBoolean(asData(data.settings).allowRetake),
      maxAttemptsPerPlayer: Math.max(1, asNumber(asData(data.settings).maxAttemptsPerPlayer, 1)),
      showLeaderboardDuringPlay: asBoolean(asData(data.settings).showLeaderboardDuringPlay, true),
      showLeaderboardAfterFinish: asBoolean(asData(data.settings).showLeaderboardAfterFinish, true)
    }
  };
}

export async function lookupFlashQuizServer(decoded: DecodedIdToken, flashCode: string) {
  const flashQuiz = await getFlashQuizByCode(flashCode);
  const profile = await getUserProfile(decoded);
  const player = await getAdminDb().collection("flashPlayers").doc(flashPlayerId(flashQuiz.id, decoded.uid)).get();
  const allowed =
    profile.isAdmin ||
    asString(flashQuiz.hostId) === decoded.uid ||
    player.exists ||
    asString(flashQuiz.visibility) === "link-only";
  if (!allowed) throw new Error("Flash Quiz is not available.");
  return publicFlashQuiz(flashQuiz);
}

export async function getSafeFlashQuestionsServer(decoded: DecodedIdToken, flashQuizId: string) {
  const flashQuiz = await getFlashQuiz(flashQuizId);
  const player = await getAdminDb().collection("flashPlayers").doc(flashPlayerId(flashQuizId, decoded.uid)).get();
  const profile = await getUserProfile(decoded);
  const allowed = player.exists || asString(flashQuiz.hostId) === decoded.uid || profile.isAdmin;
  if (!allowed) throw new Error("Join this Flash Quiz before loading questions.");
  const questions = await getFullFlashQuestions(flashQuizId);
  return questions.map(safeFlashQuestion);
}

export async function startFlashQuizServer(decoded: DecodedIdToken, flashQuizId: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  assertNotExpired(flashQuiz);
  if (asString(flashQuiz.mode) !== "live") throw new Error("Self-paced Flash Quizzes do not need host start.");
  if (asString(flashQuiz.status) !== "active") throw new Error("Only active Flash Quizzes can be started.");
  const now = new Date();
  const timer = asNumber(flashQuiz.questionTimerSeconds, 30);
  const playersSnapshot = await db.collection("flashPlayers").where("flashQuizId", "==", flashQuizId).get();
  const batch = db.batch();
  batch.update(db.collection("flashQuizzes").doc(flashQuizId), {
    status: "running",
    currentQuestionIndex: 0,
    questionStartedAt: Timestamp.fromDate(now),
    questionEndsAt: Timestamp.fromDate(new Date(now.getTime() + timer * 1000)),
    startedAt: Timestamp.fromDate(now),
    updatedAt: FieldValue.serverTimestamp()
  });
  playersSnapshot.docs.forEach((docSnapshot) => {
    if (!activePlayer(docSnapshot.data())) return;
    batch.update(docSnapshot.ref, {
      status: "playing",
      lastActiveAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
}

async function rebuildFlashRanks(flashQuizId: string, completed = false) {
  const db = getAdminDb();
  const playersSnapshot = await db.collection("flashPlayers").where("flashQuizId", "==", flashQuizId).get();
  const flashQuizSnapshot = await db.collection("flashQuizzes").doc(flashQuizId).get();
  if (!flashQuizSnapshot.exists) return;
  const flashQuiz = snapshotData(flashQuizSnapshot.id, flashQuizSnapshot.data());
  const players = playersSnapshot.docs
    .map((docSnapshot) => snapshotData(docSnapshot.id, docSnapshot.data()))
    .filter(activePlayer)
    .sort((first, second) => {
      if (asNumber(second.score) !== asNumber(first.score)) return asNumber(second.score) - asNumber(first.score);
      if (asNumber(second.accuracy) !== asNumber(first.accuracy)) return asNumber(second.accuracy) - asNumber(first.accuracy);
      return asNumber(first.totalTimeSeconds) - asNumber(second.totalTimeSeconds);
    });
  const batch = db.batch();
  players.forEach((player, index) => {
    const rank = index + 1;
    const previousRank = asNumber(player.rank, rank);
    batch.set(db.collection("flashPlayers").doc(asString(player.id)), {
      previousRank,
      rank,
      rankDelta: previousRank - rank,
      lastActiveAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (completed || asString(player.status) === "completed") {
      batch.set(db.collection("flashResults").doc(flashResultId(flashQuizId, asString(player.userId))), {
        flashQuizId,
        flashCode: asString(flashQuiz.flashCode),
        playerId: asString(player.id),
        userId: asString(player.userId),
        displayName: asString(player.displayName, "Quizora Player"),
        photoURL: asString(player.photoURL) || null,
        score: asNumber(player.score),
        totalPoints: asNumber(flashQuiz.totalPoints),
        accuracy: asNumber(player.accuracy),
        correctCount: asNumber(player.correctCount),
        wrongCount: asNumber(player.wrongCount),
        skippedCount: asNumber(player.skippedCount),
        rank,
        previousRank,
        totalTimeSeconds: asNumber(player.totalTimeSeconds),
        completedAt: toDate(player.completedAt) ?? new Date(),
        createdAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  });
  await batch.commit();
}

function answerPayload({
  flashQuiz,
  question,
  questionIndex,
  userId,
  answer,
  timeTakenSeconds,
  skipped = false
}: {
  flashQuiz: Data & { id: string };
  question: FlashQuestion;
  questionIndex: number;
  userId: string;
  answer: QuizAnswerState;
  timeTakenSeconds: number;
  skipped?: boolean;
}) {
  const scored = skipped
    ? { isCorrect: false, pointsEarned: 0, pointsPossible: question.points }
    : scoreFlashAnswer(question, answer);
  const speedBonus =
    asString(flashQuiz.leaderboardMode) === "score-speed" && scored.isCorrect
      ? Math.max(0, Math.round(Math.min(5, question.points * 0.25) * (1 - Math.min(timeTakenSeconds, question.timeLimitSeconds) / question.timeLimitSeconds)))
      : 0;

  return {
    flashQuizId: flashQuiz.id,
    flashCode: asString(flashQuiz.flashCode),
    playerId: flashPlayerId(flashQuiz.id, userId),
    userId,
    questionId: question.id,
    questionIndex,
    selectedAnswer: skipped ? "" : question.type === "text" || question.type === "short-answer" ? "" : answer.selectedAnswer,
    selectedAnswers: skipped ? [] : answer.selectedAnswers,
    textAnswer: skipped ? "" : answer.textAnswer.trim(),
    isCorrect: scored.isCorrect,
    pointsEarned: scored.pointsEarned + speedBonus,
    pointsPossible: question.points,
    timeTakenSeconds,
    answeredAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  };
}

export async function submitFlashAnswerServer({
  decoded,
  flashQuizId,
  questionIndex,
  answer
}: {
  decoded: DecodedIdToken;
  flashQuizId: string;
  questionIndex: number;
  answer: QuizAnswerState;
}) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  assertNotExpired(flashQuiz);
  const mode = asString(flashQuiz.mode);
  const status = asString(flashQuiz.status);
  if (mode === "live" && status !== "running") throw new Error("This Flash Quiz is not accepting answers.");
  if (mode === "self-paced" && status !== "active" && status !== "running") throw new Error("This Flash Quiz is closed.");
  if (mode === "live" && asNumber(flashQuiz.currentQuestionIndex) !== questionIndex) {
    throw new Error("This question has already moved on.");
  }
  const questions = await getFullFlashQuestions(flashQuizId);
  const question = questions[questionIndex];
  if (!question) throw new Error("Flash question was not found.");
  const playerRef = db.collection("flashPlayers").doc(flashPlayerId(flashQuizId, decoded.uid));
  const answerRef = db.collection("flashAnswers").doc(flashAnswerId(flashQuizId, questionIndex, decoded.uid));
  const startedAt = mode === "live" ? toDate(flashQuiz.questionStartedAt) : null;
  const timeTakenSeconds = mode === "live"
    ? Math.max(0, Math.round((Date.now() - (startedAt?.getTime() ?? Date.now())) / 1000))
    : Math.max(0, Math.round(answer.timeSpentSeconds || question.timeLimitSeconds));
  const payload = answerPayload({ flashQuiz, question, questionIndex, userId: decoded.uid, answer, timeTakenSeconds });
  const completed = mode === "self-paced" && questionIndex >= questions.length - 1;

  await db.runTransaction(async (transaction) => {
    const [playerSnapshot, existingAnswer, freshQuizSnapshot] = await Promise.all([
      transaction.get(playerRef),
      transaction.get(answerRef),
      transaction.get(db.collection("flashQuizzes").doc(flashQuizId))
    ]);
    if (!freshQuizSnapshot.exists) throw new Error("Flash Quiz changed.");
    if (!playerSnapshot.exists) throw new Error("Join this Flash Quiz before answering.");
    if (existingAnswer.exists) {
      transaction.update(db.collection("flashQuizzes").doc(flashQuizId), {
        "antiAbuse.duplicateAnswerAttempts": FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
      throw new Error("This answer is already submitted.");
    }
    const player = playerSnapshot.data() ?? {};
    if (!activePlayer(player)) throw new Error("You are not active in this Flash Quiz.");
    const nextCorrect = asNumber(player.correctCount) + (payload.isCorrect ? 1 : 0);
    const answeredSomething = Boolean(payload.selectedAnswer || payload.selectedAnswers.length || payload.textAnswer);
    const nextWrong = asNumber(player.wrongCount) + (!payload.isCorrect && answeredSomething ? 1 : 0);
    const nextSkipped = asNumber(player.skippedCount);
    const nextScore = asNumber(player.score) + payload.pointsEarned;
    const answeredCount = nextCorrect + nextWrong + nextSkipped;
    const accuracy = answeredCount ? Math.round((nextCorrect / answeredCount) * 100) : 0;
    transaction.set(answerRef, payload);
    transaction.set(playerRef, {
      status: completed ? "completed" : "submitted",
      score: nextScore,
      accuracy,
      correctCount: nextCorrect,
      wrongCount: nextWrong,
      skippedCount: nextSkipped,
      totalTimeSeconds: asNumber(player.totalTimeSeconds) + payload.timeTakenSeconds,
      completedAt: completed ? FieldValue.serverTimestamp() : null,
      lastActiveAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (completed) {
      transaction.set(db.collection("flashQuizzes").doc(flashQuizId), {
        status: asString(flashQuiz.mode) === "self-paced" ? "active" : asString(flashQuiz.status),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  });

  await rebuildFlashRanks(flashQuizId, false);
  return {
    completed,
    resultPath: completed ? `/flash/${asString(flashQuiz.flashCode)}/result` : undefined
  };
}

function writeSkippedAnswer(transaction: Transaction, flashQuiz: Data & { id: string }, question: FlashQuestion, player: Data & { id: string }, questionIndex: number) {
  const skipped: QuizAnswerState = { selectedAnswer: "", selectedAnswers: [], textAnswer: "", timeSpentSeconds: question.timeLimitSeconds };
  const payload = answerPayload({
    flashQuiz,
    question,
    questionIndex,
    userId: asString(player.userId),
    answer: skipped,
    timeTakenSeconds: question.timeLimitSeconds,
    skipped: true
  });
  transaction.set(getAdminDb().collection("flashAnswers").doc(flashAnswerId(flashQuiz.id, questionIndex, asString(player.userId))), payload);
  const answeredCount = asNumber(player.correctCount) + asNumber(player.wrongCount) + asNumber(player.skippedCount) + 1;
  const accuracy = answeredCount ? Math.round((asNumber(player.correctCount) / answeredCount) * 100) : 0;
  transaction.set(getAdminDb().collection("flashPlayers").doc(asString(player.id)), {
    skippedCount: asNumber(player.skippedCount) + 1,
    accuracy,
    totalTimeSeconds: asNumber(player.totalTimeSeconds) + question.timeLimitSeconds,
    lastActiveAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function advanceFlashQuizServer(decoded: DecodedIdToken, flashQuizId: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  assertNotExpired(flashQuiz);
  if (asString(flashQuiz.mode) !== "live") throw new Error("Only live Flash Quizzes can advance.");
  if (asString(flashQuiz.status) !== "running") throw new Error("Only running Flash Quizzes can advance.");
  const questions = await getFullFlashQuestions(flashQuizId);
  const questionIndex = asNumber(flashQuiz.currentQuestionIndex);
  const question = questions[questionIndex];
  if (!question) throw new Error("Current Flash question is missing.");
  const playersSnapshot = await db.collection("flashPlayers").where("flashQuizId", "==", flashQuizId).get();
  const activePlayers = playersSnapshot.docs.map((docSnapshot) => snapshotData(docSnapshot.id, docSnapshot.data())).filter(activePlayer);
  const answerRefs = activePlayers.map((player) => db.collection("flashAnswers").doc(flashAnswerId(flashQuizId, questionIndex, asString(player.userId))));
  const completed = questionIndex >= questions.length - 1;

  await db.runTransaction(async (transaction) => {
    const answerSnapshots = await Promise.all(answerRefs.map((ref) => transaction.get(ref)));
    activePlayers.forEach((player, index) => {
      if (!answerSnapshots[index].exists) {
        writeSkippedAnswer(transaction, flashQuiz, question, player, questionIndex);
      }
    });
    if (!completed) {
      const now = new Date();
      transaction.update(db.collection("flashQuizzes").doc(flashQuizId), {
        currentQuestionIndex: questionIndex + 1,
        questionStartedAt: Timestamp.fromDate(now),
        questionEndsAt: Timestamp.fromDate(new Date(now.getTime() + asNumber(flashQuiz.questionTimerSeconds, 30) * 1000)),
        updatedAt: FieldValue.serverTimestamp()
      });
      activePlayers.forEach((player) => {
        transaction.set(db.collection("flashPlayers").doc(asString(player.id)), {
          status: "playing",
          lastActiveAt: FieldValue.serverTimestamp()
        }, { merge: true });
      });
      return;
    }
    const endedAt = new Date();
    transaction.update(db.collection("flashQuizzes").doc(flashQuizId), {
      status: "ended",
      endedAt: Timestamp.fromDate(endedAt),
      updatedAt: FieldValue.serverTimestamp()
    });
    activePlayers.forEach((player) => {
      transaction.set(db.collection("flashPlayers").doc(asString(player.id)), {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        lastActiveAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
  });

  await rebuildFlashRanks(flashQuizId, completed);
  return { completed };
}

export async function finalizeFlashQuizServer(decoded: DecodedIdToken, flashQuizId: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  if (asString(flashQuiz.status) === "archived") throw new Error("Archived Flash Quizzes cannot be finalized.");
  const playersSnapshot = await db.collection("flashPlayers").where("flashQuizId", "==", flashQuizId).get();
  const batch = db.batch();
  batch.set(db.collection("flashQuizzes").doc(flashQuizId), {
    status: "ended",
    endedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  playersSnapshot.docs.forEach((docSnapshot) => {
    if (!activePlayer(docSnapshot.data())) return;
    batch.set(docSnapshot.ref, {
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
  await rebuildFlashRanks(flashQuizId, true);
}

export async function extendFlashQuizServer(decoded: DecodedIdToken, flashQuizId: string, expiryHours: number) {
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  assertNotExpired(flashQuiz);
  const { limits, profile } = await getLimits(decoded);
  if (!profile.isAdmin && !limits.canExtendExpiry) throw new Error("Upgrade to extend Flash Quiz expiry.");
  if (asString(flashQuiz.status) === "ended" || asString(flashQuiz.status) === "archived") {
    throw new Error("Ended Flash Quizzes cannot be extended.");
  }
  if (!profile.isAdmin && asNumber(flashQuiz.extensionCount) >= 3) throw new Error("This Flash Quiz has reached the extension limit.");
  const nextHours = Math.max(1, Math.min(limits.maxExpiryHours, Math.round(expiryHours)));
  const expiresAt = new Date(Date.now() + nextHours * 60 * 60 * 1000);
  await getAdminDb().collection("flashQuizzes").doc(flashQuizId).set({
    expiryHours: nextHours,
    expiresAt: Timestamp.fromDate(expiresAt),
    isPremiumExtended: true,
    extensionCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return expiresAt.toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "flash-quiz";
}

export async function convertFlashQuizToDraftServer(decoded: DecodedIdToken, flashQuizId: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  const { limits, profile } = await getLimits(decoded);
  if (!profile.isAdmin && !limits.canConvertToDraft) {
    throw new Error("Upgrade or request creator access to convert Flash Quizzes into drafts.");
  }
  const questions = await getFullFlashQuestions(flashQuizId);
  if (!questions.length) throw new Error("This Flash Quiz has no questions to convert.");
  const quizRef = db.collection("quizzes").doc();
  const slug = `${slugify(asString(flashQuiz.title))}-${asString(flashQuiz.flashCode).toLowerCase()}`;
  const batch = db.batch();
  batch.set(quizRef, {
    title: asString(flashQuiz.title),
    slug,
    description: asString(flashQuiz.description),
    shortDescription: asString(flashQuiz.description).slice(0, 180),
    categoryId: "mixed-challenge",
    categoryName: "Mixed Challenge",
    difficulty: "easy",
    status: "draft",
    visibility: "private",
    thumbnailUrl: "",
    tags: ["flash-conversion"],
    estimatedMinutes: Math.max(1, Math.round(questions.length * asNumber(flashQuiz.questionTimerSeconds, 30) / 60)),
    questionCount: questions.length,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0),
    timeLimitSeconds: questions.reduce((sum, question) => sum + question.timeLimitSeconds, 0),
    isFeatured: false,
    isDailyChallenge: false,
    playCount: 0,
    averageScore: 0,
    createdBy: decoded.uid,
    updatedBy: decoded.uid,
    ownerId: decoded.uid,
    ownerName: profile.displayName,
    ownerEmail: profile.email,
    ownerType: "creator",
    publishScope: "private",
    reviewStatus: "draft",
    rejectionNote: "",
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: "",
    reviewedByName: "",
    approvedAt: null,
    approvedBy: "",
    creatorEditable: true,
    allowedClassIds: [],
    copiedFromFlashQuizId: flashQuizId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: null
  });
  questions.forEach((question, index) => {
    batch.set(db.collection("questions").doc(`${quizRef.id}_${index}`), {
      quizId: quizRef.id,
      type: question.type,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      correctOptionId: question.correctOptionId || question.correctAnswer,
      correctOptionIds: question.correctOptionIds || question.correctAnswers,
      correctText: question.correctText || question.correctAnswer,
      acceptableAnswers: question.acceptableAnswers || [],
      caseSensitive: question.caseSensitive || false,
      trimWhitespace: question.trimWhitespace !== false,
      explanation: question.explanation,
      imageUrl: "",
      points: question.points,
      timeLimitSeconds: question.timeLimitSeconds,
      order: index,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  batch.set(db.collection("flashQuizzes").doc(flashQuizId), {
    convertedQuizId: quizRef.id,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();
  return { quizId: quizRef.id, editPath: `/creator/quizzes/${quizRef.id}/edit` };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportFlashResultsServer(decoded: DecodedIdToken, flashQuizId: string) {
  const flashQuiz = await getFlashQuiz(flashQuizId);
  await assertHostOrAdmin(flashQuiz, decoded);
  const { limits, profile } = await getLimits(decoded);
  if (!profile.isAdmin && !limits.canExportResults) throw new Error("Upgrade to export Flash Quiz results.");
  const snapshot = await getAdminDb()
    .collection("flashResults")
    .where("flashQuizId", "==", flashQuizId)
    .orderBy("rank", "asc")
    .get();
  const rows = snapshot.docs.map((docSnapshot) => docSnapshot.data());
  const header = ["rank", "player name", "score", "accuracy", "correct", "wrong", "skipped", "total time", "completedAt"];
  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((row) =>
      [
        row.rank,
        row.displayName,
        row.score,
        row.accuracy,
        row.correctCount,
        row.wrongCount,
        row.skippedCount,
        row.totalTimeSeconds,
        toDate(row.completedAt)?.toISOString() ?? ""
      ].map(csvEscape).join(",")
    )
  ];
  return lines.join("\n");
}

export async function reportFlashQuizServer(decoded: DecodedIdToken, flashQuizId: string, reason: string, details: string) {
  const db = getAdminDb();
  const flashQuiz = await getFlashQuiz(flashQuizId);
  if (asString(flashQuiz.status) === "archived") throw new Error("This Flash Quiz is no longer reportable.");
  const playerSnapshot = await db.collection("flashPlayers").doc(flashPlayerId(flashQuizId, decoded.uid)).get();
  if (!playerSnapshot.exists && asString(flashQuiz.hostId) !== decoded.uid) {
    throw new Error("Join this Flash Quiz before reporting it.");
  }
  if (!reason.trim()) throw new Error("Choose a report reason.");
  await db.collection("flashReports").add({
    flashQuizId,
    flashCode: asString(flashQuiz.flashCode),
    reportedBy: decoded.uid,
    reason: reason.trim().slice(0, 120),
    details: details.trim().slice(0, 1200),
    status: "open",
    reviewedBy: "",
    adminNote: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await db.collection("flashQuizzes").doc(flashQuizId).set({
    "antiAbuse.reportCount": FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function archiveFlashQuizServer(flashQuizId: string) {
  await getAdminDb().collection("flashQuizzes").doc(flashQuizId).set({
    status: "archived",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}
