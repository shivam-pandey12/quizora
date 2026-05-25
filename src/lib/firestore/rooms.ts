import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import {
  mapQuestion,
  mapRoom,
  mapRoomAnswer,
  mapRoomPlayer,
  mapRoomResult
} from "@/lib/firestore/mappers";
import {
  getPlayableQuiz,
  listActivePlayQuestions,
  saveLiveRoomAttempt
} from "@/lib/firestore/attempts";
import { calculateXPForAttempt } from "@/lib/quiz/xp";
import { scoreSingleQuestion } from "@/lib/quiz/scoring";
import { isSkippedAnswer, scoreQuestionAnswer } from "@/lib/quiz/question-engine";
import type {
  Question,
  QuizAnswerState,
  Room,
  RoomAnswer,
  RoomInput,
  RoomPlayer,
  RoomResult,
  RoomSource,
  RoomVisibility,
  UserProfile
} from "@/types/domain";

const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomRosterReadLimit = 60;
const roomAnswerReadLimit = 600;
const roomQuestionReadLimit = 250;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function getCollection(name: "rooms" | "roomPlayers" | "roomAnswers" | "roomResults" | "questions") {
  return collection(ensureDb(), name);
}

function activePlayer(player: RoomPlayer) {
  return player.status !== "left" && player.status !== "disconnected";
}

function defaultRoomAnalytics() {
  return {
    totalJoined: 1,
    peakPlayers: 1,
    startedPlayerCount: 0,
    completedPlayerCount: 0,
    averageScore: 0,
    averageAccuracy: 0,
    averageTimePerQuestion: 0,
    abandonCount: 0,
    durationSeconds: 0,
    questionStats: []
  };
}

function defaultAntiAbuse() {
  return {
    duplicateSubmissionBlocked: true,
    clientScored: true,
    duplicateAnswerAttempts: 0,
    fastAdvanceCount: 0,
    answerAfterEndCount: 0,
    joinLeaveCount: 0,
    flags: []
  };
}

function buildCompletionAnalytics({
  room,
  players,
  completedAt
}: {
  room: Room;
  players: RoomPlayer[];
  completedAt: Date;
}) {
  const completedPlayers = players.filter(activePlayer);
  const completedPlayerCount = completedPlayers.length;
  const averageScore = completedPlayerCount
    ? Math.round(completedPlayers.reduce((sum, player) => sum + player.score, 0) / completedPlayerCount)
    : 0;
  const averageAccuracy =
    completedPlayerCount && room.totalQuestions
      ? Math.round(
          (completedPlayers.reduce((sum, player) => sum + player.correctCount, 0) /
            (completedPlayerCount * room.totalQuestions)) *
            100
        )
      : 0;
  const durationSeconds = room.startedAt
    ? Math.max(0, Math.round((completedAt.getTime() - new Date(room.startedAt).getTime()) / 1000))
    : 0;
  const averageTimePerQuestion = room.totalQuestions
    ? Math.round(durationSeconds / room.totalQuestions)
    : 0;

  return {
    totalJoined: Math.max(room.analytics.totalJoined, room.playerCount, completedPlayerCount),
    peakPlayers: Math.max(room.analytics.peakPlayers, room.playerCount, completedPlayerCount),
    startedPlayerCount: room.analytics.startedPlayerCount || completedPlayerCount,
    completedPlayerCount,
    averageScore,
    averageAccuracy,
    averageTimePerQuestion,
    abandonCount: Math.max(0, Math.max(room.analytics.peakPlayers, room.playerCount) - completedPlayerCount),
    durationSeconds,
    questionStats: room.analytics.questionStats
  };
}

function buildSuspiciousFlags({
  room,
  players,
  completedAt
}: {
  room: Room;
  players: RoomPlayer[];
  completedAt: Date;
}) {
  const flags = new Set(room.antiAbuse.flags);
  const activePlayers = players.filter(activePlayer);
  const durationSeconds = room.startedAt
    ? Math.max(0, Math.round((completedAt.getTime() - new Date(room.startedAt).getTime()) / 1000))
    : 0;
  const perfectPlayers = activePlayers.filter(
    (player) => room.totalQuestions > 0 && player.correctCount >= room.totalQuestions
  );

  if (durationSeconds && durationSeconds < Math.max(8, room.totalQuestions * 5)) {
    flags.add("Room completed unusually fast");
  }
  if (perfectPlayers.length && durationSeconds < Math.max(12, room.totalQuestions * 8)) {
    flags.add("Perfect score with very low room duration");
  }
  if (room.antiAbuse.joinLeaveCount > Math.max(6, room.maxPlayers)) {
    flags.add("High join/leave churn");
  }
  if (room.antiAbuse.duplicateAnswerAttempts > 0) {
    flags.add("Duplicate answer attempts blocked");
  }

  return Array.from(flags);
}

function randomRoomCode() {
  return Array.from({ length: 6 }, () =>
    roomCodeAlphabet[Math.floor(Math.random() * roomCodeAlphabet.length)]
  ).join("");
}

function shuffled<T>(items: T[]) {
  return [...items]
    .map((item) => ({ item, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ item }) => item);
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function roomPlayerId(roomId: string, userId: string) {
  return `${roomId}_${userId}`;
}

export function roomAnswerId(roomId: string, questionIndex: number, userId: string) {
  return `${roomId}_${questionIndex}_${userId}`;
}

export function roomResultId(roomId: string, userId: string) {
  return `${roomId}_${userId}`;
}

export function botUserId(botId: string) {
  return `bot_${botId}`;
}

async function codeExists(roomCode: string) {
  const snapshot = await getDocs(
    query(getCollection("rooms"), where("roomCode", "==", roomCode), limit(1))
  );
  return !snapshot.empty;
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = randomRoomCode();
    if (!(await codeExists(roomCode))) return roomCode;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

export async function getRoomByCode(roomCode: string) {
  const normalized = normalizeRoomCode(roomCode);
  const snapshot = await getDocs(
    query(getCollection("rooms"), where("roomCode", "==", normalized), limit(1))
  );
  return snapshot.empty ? null : mapRoom(snapshot.docs[0]);
}

export async function getRoom(roomId: string) {
  const snapshot = await getDoc(doc(ensureDb(), "rooms", roomId));
  return snapshot.exists() ? mapRoom(snapshot) : null;
}

export async function createRoom({
  user,
  profile,
  input
}: {
  user: User;
  profile: UserProfile | null;
  input: RoomInput;
}) {
  const quiz = await getPlayableQuiz(input.quizId);
  if (!quiz) throw new Error("Only published public quizzes can be hosted live.");
  const questions = await listActivePlayQuestions(quiz.id);
  if (!questions.length) throw new Error("This quiz needs active questions before live hosting.");

  const roomCode = await createUniqueRoomCode();
  const roomRef = doc(getCollection("rooms"));
  const playerRef = doc(ensureDb(), "roomPlayers", roomPlayerId(roomRef.id, user.uid));
  const questionOrder = input.shuffleQuestions
    ? shuffled(questions).map((question) => question.id)
    : questions.map((question) => question.id);
  const settings = {
    questionTimerSeconds: Math.max(10, Math.min(180, input.questionTimerSeconds || 30)),
    showCorrectAfterEachQuestion: input.showCorrectAfterEachQuestion,
    allowLateJoin: input.allowLateJoin,
    requireReady: input.requireReady,
    shuffleQuestions: input.shuffleQuestions,
    shuffleOptions: input.shuffleOptions,
    autoAdvance: input.autoAdvance,
    autoAdvanceDelaySeconds: Math.max(3, Math.min(20, input.autoAdvanceDelaySeconds || 5)),
    scoringMode: input.scoringMode,
    visibility: input.visibility,
    maxPlayers: Math.max(1, Math.min(50, input.maxPlayers || 12))
  };
  const hostName = profile?.displayName || user.displayName || user.email || "Quizora Host";
  const hostPhotoURL = profile?.photoURL || user.photoURL || null;

  const batch = writeBatch(ensureDb());
  const source = input.source ?? "manual";
  const botFillDelaySeconds = Math.max(10, Math.min(120, input.botFillDelaySeconds ?? 30));
  batch.set(roomRef, {
    roomCode,
    source,
    roomTitle: input.roomTitle.trim(),
    roomDescription: input.roomDescription.trim(),
    quizId: quiz.id,
    quizSlug: quiz.slug,
    quizTitle: quiz.title,
    categoryId: quiz.categoryId,
    categoryName: quiz.categoryName,
    difficulty: quiz.difficulty,
    hostId: user.uid,
    hostName,
    hostPhotoURL,
    status: "waiting",
    visibility: input.visibility,
    maxPlayers: settings.maxPlayers,
    playerCount: 1,
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0),
    questionOrder,
    questionStartedAt: null,
    questionEndsAt: null,
    startedAt: null,
    completedAt: null,
    locked: Boolean(input.locked),
    rematchRoomId: null,
    matchmakingEnabled: Boolean(input.matchmakingEnabled),
    preferredPlayerCount: Math.max(1, Math.min(settings.maxPlayers, input.preferredPlayerCount ?? settings.maxPlayers)),
    minPlayersToStart: Math.max(1, Math.min(settings.maxPlayers, input.minPlayersToStart ?? 1)),
    allowBotFill: Boolean(input.allowBotFill),
    botFillAt: input.allowBotFill ? new Date(Date.now() + botFillDelaySeconds * 1000) : null,
    botFillDelaySeconds,
    botFillUsed: false,
    matchmakingStatus: input.matchmakingStatus ?? (source === "manual" ? "closed" : "open"),
    queueCreatedBy: input.queueCreatedBy ?? "",
    challengeId: input.challengeId ?? null,
    classId: input.classId ?? null,
    className: input.className ?? null,
    allowedMemberOnly: Boolean(input.allowedMemberOnly),
    settings,
    analytics: defaultRoomAnalytics(),
    antiAbuse: defaultAntiAbuse(),
    leaderboardMode: "casual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(playerRef, {
    roomId: roomRef.id,
    roomCode,
    userId: user.uid,
    displayName: hostName,
    photoURL: hostPhotoURL,
    role: "host",
    isBot: false,
    botId: null,
    botDifficulty: null,
    botPersonality: "",
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
  await batch.commit();
  return roomCode;
}

export async function joinRoomByCode({
  roomCode,
  user,
  profile
}: {
  roomCode: string;
  user: User;
  profile: UserProfile | null;
}) {
  const room = await getRoomByCode(roomCode);
  if (!room) throw new Error("No live room was found for that code.");
  if (room.status === "completed" || room.status === "cancelled") {
    throw new Error("This room is already closed.");
  }
  if (room.status !== "waiting" && !(room.settings.allowLateJoin && room.status === "in-progress")) {
    throw new Error("This room has already started.");
  }
  if (room.locked && room.hostId !== user.uid) {
    throw new Error("This lobby is locked by the host.");
  }
  if (room.allowedMemberOnly && room.classId) {
    const membership = await getDoc(doc(ensureDb(), "classMembers", `${room.classId}_${user.uid}`));
    if (!membership.exists() || membership.data().status !== "active") {
      throw new Error("This class room is only open to active class members.");
    }
  }

  const clientDb = ensureDb();
  const roomRef = doc(clientDb, "rooms", room.id);
  const playerRef = doc(clientDb, "roomPlayers", roomPlayerId(room.id, user.uid));
  const displayName = profile?.displayName || user.displayName || user.email || "Quizora Player";
  const photoURL = profile?.photoURL || user.photoURL || null;

  await runTransaction(clientDb, async (transaction) => {
    const freshRoom = await transaction.get(roomRef);
    if (!freshRoom.exists()) throw new Error("Room no longer exists.");
    const roomData = freshRoom.data();
    const playerSnapshot = await transaction.get(playerRef);
    const status = roomData.status;
    const allowLateJoin = Boolean(roomData.settings?.allowLateJoin);
    const locked = Boolean(roomData.locked);
    const playerCount = typeof roomData.playerCount === "number" ? roomData.playerCount : 0;
    const maxPlayers = typeof roomData.maxPlayers === "number" ? roomData.maxPlayers : 12;
    const analytics =
      typeof roomData.analytics === "object" && roomData.analytics
        ? (roomData.analytics as Record<string, unknown>)
        : {};
    const antiAbuse =
      typeof roomData.antiAbuse === "object" && roomData.antiAbuse
        ? (roomData.antiAbuse as Record<string, unknown>)
        : {};

    if (playerSnapshot.exists()) {
      const existingPlayer = mapRoomPlayer(playerSnapshot);
      transaction.update(playerRef, {
        status: status === "in-progress" ? "playing" : "joined",
        lastSeenAt: serverTimestamp()
      });
      if (existingPlayer.status === "left" || existingPlayer.status === "disconnected") {
        const nextCount = Math.min(maxPlayers, playerCount + 1);
        transaction.update(roomRef, {
          playerCount: nextCount,
          analytics: {
            ...analytics,
            peakPlayers: Math.max(Number(analytics.peakPlayers) || 0, nextCount),
            totalJoined: Math.max(Number(analytics.totalJoined) || 0, nextCount)
          },
          antiAbuse: {
            ...antiAbuse,
            joinLeaveCount: (Number(antiAbuse.joinLeaveCount) || 0) + 1
          },
          updatedAt: serverTimestamp()
        });
      }
      return;
    }

    if (status === "completed" || status === "cancelled") throw new Error("This room is closed.");
    if (status !== "waiting" && !(allowLateJoin && status === "in-progress")) {
      throw new Error("This room has already started.");
    }
    if (locked && roomData.hostId !== user.uid) throw new Error("This lobby is locked by the host.");
    if (playerCount >= maxPlayers) throw new Error("This room is full.");

    const nextCount = playerCount + 1;
    transaction.set(playerRef, {
      roomId: room.id,
      roomCode: room.roomCode,
      userId: user.uid,
      displayName,
      photoURL,
      role: user.uid === room.hostId ? "host" : "player",
      isBot: false,
      botId: null,
      botDifficulty: null,
      botPersonality: "",
      status: status === "in-progress" ? "playing" : "joined",
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      currentAnswerStatus: "idle",
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      completedAt: null
    });
    transaction.update(roomRef, {
      playerCount: nextCount,
      analytics: {
        ...analytics,
        peakPlayers: Math.max(Number(analytics.peakPlayers) || 0, nextCount),
        totalJoined: Math.max(Number(analytics.totalJoined) || 0, nextCount)
      },
      updatedAt: serverTimestamp()
    });
  });

  return room.roomCode;
}

export function listenRoomByCode(
  roomCode: string,
  onNext: (room: Room | null) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("rooms"),
      where("roomCode", "==", normalizeRoomCode(roomCode)),
      limit(1)
    ),
    (snapshot) => onNext(snapshot.empty ? null : mapRoom(snapshot.docs[0])),
    (error) => onError(error.message)
  );
}

export function listenRoomPlayers(
  roomId: string,
  onNext: (players: RoomPlayer[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("roomPlayers"),
      where("roomId", "==", roomId),
      orderBy("joinedAt", "asc"),
      limit(roomRosterReadLimit)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapRoomPlayer)),
    (error) => onError(error.message)
  );
}

export function listenRoomAnswers(
  roomId: string,
  questionIndex: number,
  onNext: (answers: RoomAnswer[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("roomAnswers"),
      where("roomId", "==", roomId),
      where("questionIndex", "==", questionIndex),
      limit(roomRosterReadLimit)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapRoomAnswer)),
    (error) => onError(error.message)
  );
}

export function listenRoomResults(
  roomId: string,
  onNext: (results: RoomResult[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("roomResults"),
      where("roomId", "==", roomId),
      orderBy("rank", "asc"),
      limit(roomRosterReadLimit)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapRoomResult)),
    (error) => onError(error.message)
  );
}

export interface PublicRoomFilters {
  search?: string;
  categoryId?: string;
  difficulty?: string;
  source?: RoomSource | "all";
  availableOnly?: boolean;
  count?: number;
}

export async function listPublicWaitingRooms(filters: PublicRoomFilters | number = 6) {
  const options =
    typeof filters === "number"
      ? { count: filters }
      : { count: 24, ...filters };
  const snapshot = await getDocs(
    query(
      getCollection("rooms"),
      where("visibility", "==", "public"),
      where("status", "==", "waiting"),
      orderBy("createdAt", "desc"),
      limit(options.count ?? 24)
    )
  );
  const normalizedSearch = options.search?.trim().toLowerCase() ?? "";
  return snapshot.docs.map(mapRoom).filter((room) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        room.roomCode,
        room.roomTitle,
        room.roomDescription,
        room.quizTitle,
        room.hostName,
        room.categoryName
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesCategory = !options.categoryId || room.categoryId === options.categoryId;
    const matchesDifficulty = !options.difficulty || room.difficulty === options.difficulty;
    const matchesSource = !options.source || options.source === "all" || room.source === options.source;
    const hasSpot = !options.availableOnly || room.playerCount < room.maxPlayers;
    return matchesSearch && matchesCategory && matchesDifficulty && matchesSource && hasSpot;
  });
}

export async function listRecentAdminRooms(count = 60) {
  const snapshot = await getDocs(
    query(getCollection("rooms"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapRoom);
}

export async function listUserRoomHistory(userId: string, count = 12) {
  const [resultsSnapshot, hostedSnapshot] = await Promise.all([
    getDocs(
      query(
        getCollection("roomResults"),
        where("userId", "==", userId),
        orderBy("completedAt", "desc"),
        limit(count)
      )
    ),
    getDocs(
      query(
        getCollection("rooms"),
        where("hostId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(count)
      )
    )
  ]);

  return {
    results: resultsSnapshot.docs.map(mapRoomResult),
    hostedRooms: hostedSnapshot.docs.map(mapRoom)
  };
}

export async function listRoomPlayersOnce(roomId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("roomPlayers"),
      where("roomId", "==", roomId),
      orderBy("joinedAt", "asc"),
      limit(roomRosterReadLimit)
    )
  );
  return snapshot.docs.map(mapRoomPlayer);
}

export async function listRoomAnswers(roomId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("roomAnswers"),
      where("roomId", "==", roomId),
      orderBy("questionIndex", "asc"),
      limit(roomAnswerReadLimit)
    )
  );
  return snapshot.docs.map(mapRoomAnswer);
}

export async function listRoomResultsOnce(roomId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("roomResults"),
      where("roomId", "==", roomId),
      orderBy("rank", "asc"),
      limit(roomRosterReadLimit)
    )
  );
  return snapshot.docs.map(mapRoomResult);
}

export async function updatePlayerHeartbeat(roomId: string, userId: string) {
  await updateDoc(doc(ensureDb(), "roomPlayers", roomPlayerId(roomId, userId)), {
    lastSeenAt: serverTimestamp()
  });
}

export async function setPlayerReady(roomId: string, userId: string, ready: boolean) {
  await updateDoc(doc(ensureDb(), "roomPlayers", roomPlayerId(roomId, userId)), {
    status: ready ? "ready" : "joined",
    lastSeenAt: serverTimestamp()
  });
}

export async function leaveRoom(room: Room, userId: string) {
  const clientDb = ensureDb();
  const playerRef = doc(clientDb, "roomPlayers", roomPlayerId(room.id, userId));
  const roomRef = doc(clientDb, "rooms", room.id);

  await runTransaction(clientDb, async (transaction) => {
    const playerSnapshot = await transaction.get(playerRef);
    const roomSnapshot = await transaction.get(roomRef);
    if (!playerSnapshot.exists() || !roomSnapshot.exists()) return;
    const player = mapRoomPlayer(playerSnapshot);
    const freshRoom = mapRoom(roomSnapshot);
    if (player.status === "left") return;

    transaction.update(playerRef, {
      status: "left",
      currentAnswerStatus: "idle",
      lastSeenAt: serverTimestamp()
    });
    transaction.update(roomRef, {
      playerCount: Math.max(0, freshRoom.playerCount - 1),
      status:
        freshRoom.hostId === userId && freshRoom.status === "waiting"
          ? "cancelled"
          : freshRoom.status,
      antiAbuse: {
        ...freshRoom.antiAbuse,
        joinLeaveCount: freshRoom.antiAbuse.joinLeaveCount + 1
      },
      updatedAt: serverTimestamp()
    });
  });
}

export async function cancelRoom(roomId: string) {
  await updateDoc(doc(ensureDb(), "rooms", roomId), {
    status: "cancelled",
    updatedAt: serverTimestamp()
  });
}

export async function kickRoomPlayer(room: Room, targetUserId: string) {
  if (room.status !== "waiting") throw new Error("Players can only be removed before the room starts.");
  if (targetUserId === room.hostId) throw new Error("The host cannot be removed from their own room.");

  const clientDb = ensureDb();
  const playerRef = doc(clientDb, "roomPlayers", roomPlayerId(room.id, targetUserId));
  const roomRef = doc(clientDb, "rooms", room.id);

  await runTransaction(clientDb, async (transaction) => {
    const [roomSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(playerRef)
    ]);
    if (!roomSnapshot.exists()) throw new Error("Room no longer exists.");
    if (!playerSnapshot.exists()) return;
    const freshRoom = mapRoom(roomSnapshot);
    const player = mapRoomPlayer(playerSnapshot);
    if (freshRoom.status !== "waiting") throw new Error("Players can only be removed before start.");
    if (!activePlayer(player)) return;

    transaction.update(playerRef, {
      status: "left",
      currentAnswerStatus: "idle",
      lastSeenAt: serverTimestamp()
    });
    transaction.update(roomRef, {
      playerCount: Math.max(0, freshRoom.playerCount - 1),
      antiAbuse: {
        ...freshRoom.antiAbuse,
        joinLeaveCount: freshRoom.antiAbuse.joinLeaveCount + 1
      },
      updatedAt: serverTimestamp()
    });
  });
}

export async function setRoomLocked(room: Room, locked: boolean) {
  if (room.status !== "waiting") throw new Error("Locking is only available before the room starts.");
  await updateDoc(doc(ensureDb(), "rooms", room.id), {
    locked,
    updatedAt: serverTimestamp()
  });
}

export async function setRoomVisibility(room: Room, visibility: RoomVisibility) {
  if (room.status !== "waiting") throw new Error("Visibility can only change before the room starts.");
  await updateDoc(doc(ensureDb(), "rooms", room.id), {
    visibility,
    "settings.visibility": visibility,
    updatedAt: serverTimestamp()
  });
}

export async function startRoom(room: Room, players: RoomPlayer[]) {
  const clientDb = ensureDb();
  const roomRef = doc(clientDb, "rooms", room.id);
  const playerRefs = players.filter(activePlayer).map((player) => ({
    player,
    ref: doc(clientDb, "roomPlayers", player.id)
  }));

  await runTransaction(clientDb, async (transaction) => {
    const freshRoomSnapshot = await transaction.get(roomRef);
    const playerSnapshots = await Promise.all(playerRefs.map(({ ref }) => transaction.get(ref)));
    if (!freshRoomSnapshot.exists()) throw new Error("Room no longer exists.");
    const freshRoom = mapRoom(freshRoomSnapshot);
    if (freshRoom.status !== "waiting") throw new Error("Only waiting rooms can be started.");
    if (playerRefs.length < freshRoom.minPlayersToStart) {
      throw new Error(`At least ${freshRoom.minPlayersToStart} player(s) are required.`);
    }
    if (
      freshRoom.settings.requireReady &&
      playerRefs.some(({ player }) => player.status !== "ready")
    ) {
      throw new Error("Every active player must be ready before this room can start.");
    }

    const now = new Date();
    transaction.update(roomRef, {
      status: "in-progress",
      currentQuestionIndex: 0,
      questionStartedAt: now,
      questionEndsAt: new Date(now.getTime() + freshRoom.settings.questionTimerSeconds * 1000),
      startedAt: now,
      analytics: {
        ...freshRoom.analytics,
        startedPlayerCount: playerRefs.length,
        peakPlayers: Math.max(freshRoom.analytics.peakPlayers, playerRefs.length),
        totalJoined: Math.max(freshRoom.analytics.totalJoined, playerRefs.length)
      },
      matchmakingStatus: freshRoom.matchmakingEnabled ? "started" : freshRoom.matchmakingStatus,
      updatedAt: serverTimestamp()
    });
    playerSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;
      transaction.update(playerRefs[index].ref, {
        status: "playing",
        currentAnswerStatus: "idle",
        lastSeenAt: serverTimestamp()
      });
    });
  });
}

function answerPayload({
  room,
  question,
  questionIndex,
  userId,
  answer,
  skipped = false
}: {
  room: Room;
  question: Question;
  questionIndex: number;
  userId: string;
  answer: QuizAnswerState;
  skipped?: boolean;
}) {
  const startedAt = room.questionStartedAt ? new Date(room.questionStartedAt).getTime() : Date.now();
  const timeTakenSeconds = skipped
    ? room.settings.questionTimerSeconds
    : Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const scored = skipped
    ? { skipped: true, isCorrect: false, pointsEarned: 0, pointsPossible: question.points }
    : scoreSingleQuestion(question, answer);
  const scoredAnswer = scoreQuestionAnswer(question, skipped ? undefined : answer);
  const speedBonus =
    room.settings.scoringMode === "speed-bonus" && scored.isCorrect
      ? Math.max(
          0,
          Math.round(
            Math.min(5, question.points * 0.25) *
              (1 - Math.min(timeTakenSeconds, room.settings.questionTimerSeconds) / room.settings.questionTimerSeconds)
          )
        )
      : 0;

  return {
    roomId: room.id,
    roomCode: room.roomCode,
    userId,
    isBot: userId.startsWith("bot_"),
    questionId: question.id,
    questionIndex,
    questionTextSnapshot: question.questionText,
    type: question.type,
    selectedAnswer: skipped ? "" : scoredAnswer.selectedAnswer,
    selectedAnswers: skipped ? [] : scoredAnswer.selectedAnswers,
    correctAnswer: scoredAnswer.correctAnswer,
    correctAnswers: scoredAnswer.correctAnswers,
    selectedAnswerSummary: scoredAnswer.selectedAnswerSummary,
    correctAnswerSummary: scoredAnswer.correctAnswerSummary,
    textAnswer: skipped ? "" : scoredAnswer.textAnswer,
    numericAnswer: skipped ? "" : scoredAnswer.numericAnswer,
    blankAnswers: skipped ? {} : scoredAnswer.blankAnswers,
    correctBlankAnswers: scoredAnswer.correctBlankAnswers,
    matchingAnswers: skipped ? {} : scoredAnswer.matchingAnswers,
    correctMatchingAnswers: scoredAnswer.correctMatchingAnswers,
    orderingAnswerIds: skipped ? [] : scoredAnswer.orderingAnswerIds,
    correctOrderIds: scoredAnswer.correctOrderIds,
    skipped,
    isCorrect: scored.isCorrect,
    pointsEarned: scored.pointsEarned + speedBonus,
    pointsPossible: question.points,
    timeTakenSeconds,
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
    reasonText: question.reasonText,
    answeredAt: serverTimestamp()
  };
}

export async function submitRoomAnswer({
  room,
  question,
  answer,
  userId
}: {
  room: Room;
  question: Question;
  answer: QuizAnswerState;
  userId: string;
}) {
  const clientDb = ensureDb();
  const answerRef = doc(
    clientDb,
    "roomAnswers",
    roomAnswerId(room.id, room.currentQuestionIndex, userId)
  );
  const playerRef = doc(clientDb, "roomPlayers", roomPlayerId(room.id, userId));
  const roomRef = doc(clientDb, "rooms", room.id);

  await runTransaction(clientDb, async (transaction) => {
    const [freshRoomSnapshot, existingAnswer, playerSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(answerRef),
      transaction.get(playerRef)
    ]);
    if (!freshRoomSnapshot.exists()) throw new Error("Room no longer exists.");
    const freshRoom = mapRoom(freshRoomSnapshot);
    if (freshRoom.status !== "in-progress") throw new Error("This room is not accepting answers.");
    if (freshRoom.currentQuestionIndex !== room.currentQuestionIndex) {
      throw new Error("This question has already moved on.");
    }
    if (existingAnswer.exists()) throw new Error("Your answer is already submitted.");
    if (!playerSnapshot.exists()) throw new Error("You are not joined to this room.");
    const player = mapRoomPlayer(playerSnapshot);
    if (!activePlayer(player)) throw new Error("You are not active in this room.");

    const payload = answerPayload({
      room: freshRoom,
      question,
      questionIndex: freshRoom.currentQuestionIndex,
      userId,
      answer
    });

    transaction.set(answerRef, payload);
    transaction.update(playerRef, {
      status: "submitted",
      currentAnswerStatus: "submitted",
      score: player.score + payload.pointsEarned,
      correctCount: player.correctCount + (payload.isCorrect ? 1 : 0),
      wrongCount:
        player.wrongCount +
        (!payload.isCorrect && !isSkippedAnswer(answer, question) ? 1 : 0),
      lastSeenAt: serverTimestamp()
    });
  });
}

export async function advanceRoomQuestion({
  room,
  players,
  questions
}: {
  room: Room;
  players: RoomPlayer[];
  questions: Question[];
}) {
  const clientDb = ensureDb();
  const roomRef = doc(clientDb, "rooms", room.id);
  const currentQuestion = questions[room.currentQuestionIndex];
  if (!currentQuestion) throw new Error("Current question is missing.");
  const activePlayers = players.filter(activePlayer);
  const playerRefs = activePlayers.map((player) => ({
    player,
    ref: doc(clientDb, "roomPlayers", player.id),
    answerRef: doc(
      clientDb,
      "roomAnswers",
      roomAnswerId(room.id, room.currentQuestionIndex, player.userId)
    ),
    resultRef: doc(clientDb, "roomResults", roomResultId(room.id, player.userId))
  }));

  await runTransaction(clientDb, async (transaction) => {
    const freshRoomSnapshot = await transaction.get(roomRef);
    const playerSnapshots = await Promise.all(playerRefs.map(({ ref }) => transaction.get(ref)));
    const answerSnapshots = await Promise.all(playerRefs.map(({ answerRef }) => transaction.get(answerRef)));
    const resultSnapshots = await Promise.all(playerRefs.map(({ resultRef }) => transaction.get(resultRef)));

    if (!freshRoomSnapshot.exists()) throw new Error("Room no longer exists.");
    const freshRoom = mapRoom(freshRoomSnapshot);
    if (freshRoom.status !== "in-progress") throw new Error("Only active rooms can advance.");

    const nextPlayers = playerRefs.map(({ player }, index) => {
      const snapshot = playerSnapshots[index];
      const base = snapshot.exists() ? mapRoomPlayer(snapshot) : player;
      if (answerSnapshots[index].exists()) return base;

      const skippedPayload = answerPayload({
        room: freshRoom,
        question: currentQuestion,
        questionIndex: freshRoom.currentQuestionIndex,
        userId: base.userId,
        answer: {
          selectedAnswer: "",
          selectedAnswers: [],
          textAnswer: "",
          timeSpentSeconds: freshRoom.settings.questionTimerSeconds
        },
        skipped: true
      });
      transaction.set(playerRefs[index].answerRef, skippedPayload);
      transaction.update(playerRefs[index].ref, {
        skippedCount: base.skippedCount + 1,
        currentAnswerStatus: "skipped",
        lastSeenAt: serverTimestamp()
      });
      return { ...base, skippedCount: base.skippedCount + 1 };
    });

    const isFinalQuestion = freshRoom.currentQuestionIndex >= questions.length - 1;
    if (!isFinalQuestion) {
      const now = new Date();
      transaction.update(roomRef, {
        currentQuestionIndex: freshRoom.currentQuestionIndex + 1,
        questionStartedAt: now,
        questionEndsAt: new Date(now.getTime() + freshRoom.settings.questionTimerSeconds * 1000),
        updatedAt: serverTimestamp()
      });
      playerRefs.forEach(({ ref }, index) => {
        if (!playerSnapshots[index].exists()) return;
        transaction.update(ref, {
          status: "playing",
          currentAnswerStatus: "idle",
          lastSeenAt: serverTimestamp()
        });
      });
      return;
    }

    const ranked = [...nextPlayers]
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        if (second.correctCount !== first.correctCount) return second.correctCount - first.correctCount;
        return first.wrongCount - second.wrongCount;
      })
      .map((player, index) => ({ player, rank: index + 1 }));
    const completedAt = new Date();

    ranked.forEach(({ player, rank }) => {
      const refIndex = playerRefs.findIndex((item) => item.player.userId === player.userId);
      const existingResult = resultSnapshots[refIndex]?.exists()
        ? mapRoomResult(resultSnapshots[refIndex])
        : null;
      const accuracy = freshRoom.totalQuestions
        ? Math.round((player.correctCount / freshRoom.totalQuestions) * 100)
        : 0;
      const xp = calculateXPForAttempt({
        score: player.score,
        accuracy,
        currentXp: 0,
        timeTakenSeconds: freshRoom.settings.questionTimerSeconds * freshRoom.totalQuestions,
        totalQuestions: freshRoom.totalQuestions,
        streakAfter: 0,
        personalBestStatus: "first"
      });

      transaction.set(
        playerRefs[refIndex].resultRef,
        {
          roomId: freshRoom.id,
          roomCode: freshRoom.roomCode,
          userId: player.userId,
          displayName: player.displayName,
          photoURL: player.photoURL,
          isBot: player.isBot,
          botDifficulty: player.botDifficulty,
          score: player.score,
          totalPoints: freshRoom.totalPoints,
          accuracy,
          correctCount: player.correctCount,
          wrongCount: player.wrongCount,
          skippedCount: player.skippedCount,
          rank,
          xpEarned: existingResult?.xpEarned ?? xp.xpEarned,
          attemptId: existingResult?.attemptId ?? null,
          completedAt,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      transaction.update(playerRefs[refIndex].ref, {
        status: "submitted",
        completedAt,
        lastSeenAt: serverTimestamp()
      });
    });

    const analytics = buildCompletionAnalytics({
      room: freshRoom,
      players: nextPlayers,
      completedAt
    });
    const flags = buildSuspiciousFlags({
      room: freshRoom,
      players: nextPlayers,
      completedAt
    });

    transaction.update(roomRef, {
      status: "completed",
      completedAt,
      matchmakingStatus: freshRoom.matchmakingEnabled ? "closed" : freshRoom.matchmakingStatus,
      analytics,
      antiAbuse: {
        ...freshRoom.antiAbuse,
        flags
      },
      updatedAt: serverTimestamp()
    });
  });
}

export async function listRoomQuestions(room: Room) {
  const snapshot = await getDocs(
    query(
      getCollection("questions"),
      where("quizId", "==", room.quizId),
      where("status", "==", "active"),
      orderBy("order", "asc"),
      limit(roomQuestionReadLimit)
    )
  );
  const questions = snapshot.docs.map(mapQuestion);
  if (!room.questionOrder.length) return questions;
  const order = new Map(room.questionOrder.map((id, index) => [id, index]));
  return questions.sort((first, second) => (order.get(first.id) ?? 999) - (order.get(second.id) ?? 999));
}

export async function listRoomAnswersForUser(roomId: string, userId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("roomAnswers"),
      where("roomId", "==", roomId),
      where("userId", "==", userId),
      orderBy("questionIndex", "asc"),
      limit(roomQuestionReadLimit)
    )
  );
  return snapshot.docs.map(mapRoomAnswer);
}

export async function ensureLiveRoomAttempt({
  user,
  profile,
  room,
  result
}: {
  user: User;
  profile: UserProfile | null;
  room: Room;
  result: RoomResult;
}) {
  if (result.attemptId) return result.attemptId;
  const answers = await listRoomAnswersForUser(room.id, user.uid);
  return saveLiveRoomAttempt({ user, profile, room, result, answers });
}

export async function createRematchRoom({
  user,
  profile,
  room
}: {
  user: User;
  profile: UserProfile | null;
  room: Room;
}) {
  const roomCode = await createRoom({
    user,
    profile,
    input: {
      roomTitle: room.roomTitle ? `Rematch: ${room.roomTitle}` : `Rematch: ${room.quizTitle}`,
      roomDescription: room.roomDescription,
      quizId: room.quizId,
      visibility: room.visibility,
      locked: false,
      maxPlayers: room.maxPlayers,
      questionTimerSeconds: room.settings.questionTimerSeconds,
      showCorrectAfterEachQuestion: room.settings.showCorrectAfterEachQuestion,
      allowLateJoin: room.settings.allowLateJoin,
      requireReady: room.settings.requireReady,
      shuffleQuestions: room.settings.shuffleQuestions,
      shuffleOptions: room.settings.shuffleOptions,
      autoAdvance: room.settings.autoAdvance,
      autoAdvanceDelaySeconds: room.settings.autoAdvanceDelaySeconds,
      scoringMode: room.settings.scoringMode
    }
  });
  const rematch = await getRoomByCode(roomCode);
  if (rematch) {
    await updateDoc(doc(ensureDb(), "rooms", room.id), {
      rematchRoomId: rematch.id,
      updatedAt: serverTimestamp()
    });
  }
  return roomCode;
}
