import {
  doc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapRoom, mapRoomPlayer } from "@/lib/firestore/mappers";
import { botUserId, roomAnswerId, roomPlayerId } from "@/lib/firestore/rooms";
import { scoreSingleQuestion } from "@/lib/quiz/scoring";
import type {
  BotDifficulty,
  BotProfile,
  Question,
  QuizAnswerState,
  Room,
  RoomPlayer
} from "@/types/domain";

const botPool: BotProfile[] = [
  { botId: "astra", displayName: "Astra", photoURL: null, difficulty: "medium", personality: "Calm strategist" },
  { botId: "nova", displayName: "Nova", photoURL: null, difficulty: "easy", personality: "Fast learner" },
  { botId: "orion", displayName: "Orion", photoURL: null, difficulty: "hard", personality: "Precision player" },
  { botId: "mira", displayName: "Mira", photoURL: null, difficulty: "medium", personality: "Steady challenger" },
  { botId: "byte", displayName: "Byte", photoURL: null, difficulty: "easy", personality: "Playful guesser" },
  { botId: "zenith", displayName: "Zenith", photoURL: null, difficulty: "hard", personality: "Leaderboard hunter" },
  { botId: "quizron", displayName: "Quizron", photoURL: null, difficulty: "medium", personality: "Pattern seeker" },
  { botId: "sol", displayName: "Sol", photoURL: null, difficulty: "hard", personality: "Cool finisher" }
];

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function activePlayer(player: RoomPlayer) {
  return player.status !== "left" && player.status !== "disconnected";
}

function stableNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) / 4294967295;
}

function botAccuracy(difficulty: BotDifficulty | null) {
  if (difficulty === "hard") return 0.82;
  if (difficulty === "medium") return 0.62;
  return 0.38;
}

function wrongOption(question: Question, correctIds: string[]) {
  return question.options.find((option) => !correctIds.includes(option.id))?.id ?? "";
}

function botAnswerState({
  room,
  question,
  bot
}: {
  room: Room;
  question: Question;
  bot: RoomPlayer;
}): QuizAnswerState {
  const shouldBeCorrect =
    stableNumber(`${room.id}:${room.currentQuestionIndex}:${question.id}:${bot.userId}:correct`) <=
    botAccuracy(bot.botDifficulty);

  if (question.type === "multiple-choice") {
    const correctAnswers = question.correctAnswers.length
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

  if (question.type === "text") {
    return {
      selectedAnswer: "",
      selectedAnswers: [],
      textAnswer: shouldBeCorrect ? question.correctAnswer : "",
      timeSpentSeconds: 0
    };
  }

  const correctAnswer = question.correctAnswer || question.correctAnswers[0] || "";
  const fallbackWrong =
    question.type === "true-false"
      ? correctAnswer === "true"
        ? "false"
        : "true"
      : wrongOption(question, [correctAnswer]);

  return {
    selectedAnswer: shouldBeCorrect ? correctAnswer : fallbackWrong,
    selectedAnswers: [],
    textAnswer: "",
    timeSpentSeconds: 0
  };
}

export function botAnswerDelayMs(room: Room, bot: RoomPlayer, questionId: string) {
  const timerMs = Math.max(6000, room.settings.questionTimerSeconds * 1000);
  const ratio = 0.25 + stableNumber(`${room.id}:${questionId}:${bot.userId}:delay`) * 0.55;
  return Math.min(timerMs - 1500, Math.max(1200, Math.round(timerMs * ratio)));
}

export function botFillAvailable(room: Room, players: RoomPlayer[]) {
  const target = Math.min(room.maxPlayers, room.preferredPlayerCount || room.minPlayersToStart || 2);
  const activeCount = players.filter(activePlayer).length;
  return Math.max(0, target - activeCount);
}

export async function fillRoomWithBots(room: Room, players: RoomPlayer[]) {
  if (!room.allowBotFill) throw new Error("Bot fill is not enabled for this room.");
  if (room.status !== "waiting") throw new Error("Bots can only join before the room starts.");
  if (room.botFillAt && new Date(room.botFillAt).getTime() > Date.now()) {
    throw new Error("Bot fill countdown has not finished yet.");
  }
  if (room.botFillUsed) throw new Error("Bot fill already ran for this room.");
  const missing = botFillAvailable(room, players);
  if (!missing) return 0;

  const existingBotIds = new Set(players.filter((player) => player.isBot).map((player) => player.botId));
  const selectedBots = botPool.filter((bot) => !existingBotIds.has(bot.botId)).slice(0, missing);
  if (!selectedBots.length) return 0;

  const clientDb = ensureDb();
  const roomRef = doc(clientDb, "rooms", room.id);
  const playerRefs = selectedBots.map((bot) => ({
    bot,
    userId: botUserId(bot.botId),
    ref: doc(clientDb, "roomPlayers", roomPlayerId(room.id, botUserId(bot.botId)))
  }));
  let addedCount = 0;

  await runTransaction(clientDb, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    const playerSnapshots = await Promise.all(playerRefs.map(({ ref }) => transaction.get(ref)));
    if (!roomSnapshot.exists()) throw new Error("Room no longer exists.");
    const freshRoom = mapRoom(roomSnapshot);
    if (freshRoom.status !== "waiting") throw new Error("Bots can only join before start.");
    if (!freshRoom.allowBotFill) throw new Error("Bot fill is disabled.");

    const newBotRefs = playerRefs.filter((_, index) => !playerSnapshots[index].exists());
    const availableSlots = Math.max(0, freshRoom.maxPlayers - freshRoom.playerCount);
    const botsToAdd = newBotRefs.slice(0, availableSlots);
    addedCount = botsToAdd.length;

    botsToAdd.forEach(({ bot, userId, ref }) => {
      transaction.set(ref, {
        roomId: freshRoom.id,
        roomCode: freshRoom.roomCode,
        userId,
        displayName: bot.displayName,
        photoURL: bot.photoURL,
        role: "player",
        isBot: true,
        botId: bot.botId,
        botDifficulty: bot.difficulty,
        botPersonality: bot.personality,
        status: "ready",
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 0,
        currentAnswerStatus: "idle",
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        completedAt: null
      });
    });

    transaction.update(roomRef, {
      playerCount: Math.min(freshRoom.maxPlayers, freshRoom.playerCount + botsToAdd.length),
      botFillUsed: true,
      matchmakingStatus: freshRoom.matchmakingEnabled ? "ready" : freshRoom.matchmakingStatus,
      analytics: {
        ...freshRoom.analytics,
        peakPlayers: Math.max(freshRoom.analytics.peakPlayers, freshRoom.playerCount + botsToAdd.length),
        totalJoined: Math.max(freshRoom.analytics.totalJoined, freshRoom.playerCount + botsToAdd.length)
      },
      updatedAt: serverTimestamp()
    });
  });

  return addedCount;
}

export async function submitBotAnswer({
  room,
  question,
  bot
}: {
  room: Room;
  question: Question;
  bot: RoomPlayer;
}) {
  if (!bot.isBot) throw new Error("Only bot players can use bot answer simulation.");
  const clientDb = ensureDb();
  const answerRef = doc(
    clientDb,
    "roomAnswers",
    roomAnswerId(room.id, room.currentQuestionIndex, bot.userId)
  );
  const playerRef = doc(clientDb, "roomPlayers", bot.id);
  const roomRef = doc(clientDb, "rooms", room.id);

  await runTransaction(clientDb, async (transaction) => {
    const [roomSnapshot, answerSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(answerRef),
      transaction.get(playerRef)
    ]);
    if (!roomSnapshot.exists()) throw new Error("Room no longer exists.");
    if (answerSnapshot.exists()) return;
    if (!playerSnapshot.exists()) return;

    const freshRoom = mapRoom(roomSnapshot);
    const freshBot = mapRoomPlayer(playerSnapshot);
    if (freshRoom.status !== "in-progress") return;
    if (freshRoom.currentQuestionIndex !== room.currentQuestionIndex) return;
    if (!freshBot.isBot || !activePlayer(freshBot)) return;

    const answer = botAnswerState({ room: freshRoom, question, bot: freshBot });
    const scored = scoreSingleQuestion(question, answer);
    const startedAt = freshRoom.questionStartedAt
      ? new Date(freshRoom.questionStartedAt).getTime()
      : Date.now();
    const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    transaction.set(answerRef, {
      roomId: freshRoom.id,
      roomCode: freshRoom.roomCode,
      userId: freshBot.userId,
      isBot: true,
      questionId: question.id,
      questionIndex: freshRoom.currentQuestionIndex,
      questionTextSnapshot: question.questionText,
      type: question.type,
      selectedAnswer: question.type === "text" ? answer.textAnswer.trim() : answer.selectedAnswer,
      selectedAnswers: answer.selectedAnswers,
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      isCorrect: scored.isCorrect,
      pointsEarned: scored.pointsEarned,
      pointsPossible: question.points,
      timeTakenSeconds,
      explanationSnapshot: question.explanation,
      questionImageUrl: question.imageUrl,
      questionImageAlt: question.imageAlt,
      questionImageCaption: question.imageCaption,
      optionsSnapshot: question.options,
      answeredAt: serverTimestamp()
    });
    transaction.update(playerRef, {
      status: "submitted",
      currentAnswerStatus: "submitted",
      score: freshBot.score + scored.pointsEarned,
      correctCount: freshBot.correctCount + (scored.isCorrect ? 1 : 0),
      wrongCount: freshBot.wrongCount + (!scored.isCorrect && (answer.selectedAnswer || answer.selectedAnswers.length || answer.textAnswer) ? 1 : 0),
      lastSeenAt: serverTimestamp()
    });
  });
}
