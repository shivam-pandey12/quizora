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
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { getPlayableQuiz } from "@/lib/firestore/attempts";
import { listPublicQuizzes } from "@/lib/firestore/content";
import { mapMatchmakingQueueEntry, mapRoom } from "@/lib/firestore/mappers";
import { createRoom, getRoomByCode, joinRoomByCode } from "@/lib/firestore/rooms";
import type {
  MatchmakingQueueEntry,
  QuickMatchPreferences,
  Quiz,
  Room,
  UserProfile
} from "@/types/domain";

const queueMinutes = 3;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function queueCollection() {
  return collection(ensureDb(), "matchmakingQueue");
}

function roomCollection() {
  return collection(ensureDb(), "rooms");
}

function queueRef(userId: string) {
  return doc(ensureDb(), "matchmakingQueue", userId);
}

function activeRoom(room: Room) {
  return (
    room.source === "quick-match" &&
    room.visibility === "public" &&
    room.status === "waiting" &&
    !room.locked &&
    room.playerCount < room.maxPlayers &&
    room.matchmakingStatus !== "started" &&
    room.matchmakingStatus !== "closed"
  );
}

function playerTarget(preferences: QuickMatchPreferences) {
  return preferences.preferredPlayerCount === "flexible" ? 4 : preferences.preferredPlayerCount;
}

function roomMatches(room: Room, preferences: QuickMatchPreferences, strictQuiz: boolean) {
  if (!activeRoom(room)) return false;
  if (strictQuiz && preferences.preferredQuizId && room.quizId !== preferences.preferredQuizId) return false;
  if (!strictQuiz && preferences.preferredQuizId && room.quizId !== preferences.preferredQuizId) return false;
  if (preferences.preferredCategoryId && room.categoryId !== preferences.preferredCategoryId) return false;
  if (preferences.preferredDifficulty !== "any" && room.difficulty !== preferences.preferredDifficulty) return false;
  if (preferences.preferredPlayerCount !== "flexible" && room.preferredPlayerCount !== preferences.preferredPlayerCount) return false;
  return true;
}

function bestCompatibleRoom(rooms: Room[], preferences: QuickMatchPreferences) {
  const exact = rooms.find((room) => roomMatches(room, preferences, true));
  if (exact) return exact;

  const categoryMatch = rooms.find((room) => {
    if (!activeRoom(room)) return false;
    if (preferences.preferredCategoryId && room.categoryId !== preferences.preferredCategoryId) return false;
    if (preferences.preferredDifficulty !== "any" && room.difficulty !== preferences.preferredDifficulty) return false;
    if (preferences.preferredPlayerCount !== "flexible" && room.preferredPlayerCount !== preferences.preferredPlayerCount) return false;
    return true;
  });
  if (categoryMatch) return categoryMatch;

  return rooms.find((room) => {
    if (!activeRoom(room)) return false;
    if (preferences.preferredPlayerCount !== "flexible" && room.preferredPlayerCount !== preferences.preferredPlayerCount) return false;
    return true;
  }) ?? null;
}

async function choosePlayableQuiz(preferences: QuickMatchPreferences): Promise<Quiz> {
  if (preferences.preferredQuizId) {
    const quiz = await getPlayableQuiz(preferences.preferredQuizId);
    if (!quiz) throw new Error("The selected quiz is not available for quick match.");
    return quiz;
  }

  const quizzes = await listPublicQuizzes();
  const playable = quizzes.filter((quiz) => {
    if (quiz.questionCount <= 0) return false;
    if (preferences.preferredCategoryId && quiz.categoryId !== preferences.preferredCategoryId) return false;
    if (preferences.preferredDifficulty !== "any" && quiz.difficulty !== preferences.preferredDifficulty) return false;
    return true;
  });

  if (!playable.length) throw new Error("No playable public quizzes match those preferences.");
  return playable[Math.floor(Math.random() * playable.length)];
}

async function findCompatibleRoom(preferences: QuickMatchPreferences) {
  const snapshot = await getDocs(
    query(
      roomCollection(),
      where("source", "==", "quick-match"),
      where("visibility", "==", "public"),
      where("status", "==", "waiting"),
      orderBy("createdAt", "asc"),
      limit(30)
    )
  );
  return bestCompatibleRoom(snapshot.docs.map(mapRoom), preferences);
}

export async function getActiveQueueEntry(userId: string) {
  const snapshot = await getDoc(queueRef(userId));
  return snapshot.exists() ? mapMatchmakingQueueEntry(snapshot) : null;
}

export function listenQueueEntry(
  userId: string,
  onNext: (entry: MatchmakingQueueEntry | null) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    queueRef(userId),
    (snapshot) => onNext(snapshot.exists() ? mapMatchmakingQueueEntry(snapshot) : null),
    (error) => onError(error.message)
  );
}

export async function startQuickMatch({
  user,
  profile,
  preferences
}: {
  user: User;
  profile: UserProfile | null;
  preferences: QuickMatchPreferences;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + queueMinutes * 60 * 1000);
  const existing = await getActiveQueueEntry(user.uid).catch(() => null);
  const queuePayload = {
    userId: user.uid,
    displayName: profile?.displayName || user.displayName || user.email || "Quizora Player",
    photoURL: profile?.photoURL || user.photoURL || null,
    status: "searching",
    preferredQuizId: preferences.preferredQuizId,
    preferredCategoryId: preferences.preferredCategoryId,
    preferredDifficulty: preferences.preferredDifficulty,
    preferredPlayerCount: preferences.preferredPlayerCount,
    allowBotFill: preferences.allowBotFill,
    questionTimerSeconds: preferences.questionTimerSeconds,
    scoringMode: preferences.scoringMode,
    expiresAt,
    matchedRoomId: null,
    matchedRoomCode: null,
    region: "global",
    ratingBand: "casual",
    antiAbuse: {
      cancelCount: existing?.antiAbuse.cancelCount ?? 0,
      retryCount: (existing?.antiAbuse.retryCount ?? 0) + 1,
      flags:
        existing?.status === "searching"
          ? Array.from(new Set([...(existing.antiAbuse.flags ?? []), "Queue restarted while searching"]))
          : existing?.antiAbuse.flags ?? []
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(queueRef(user.uid), queuePayload);

  const matchedRoom = await findCompatibleRoom(preferences);
  if (matchedRoom) {
    const roomCode = await joinRoomByCode({ roomCode: matchedRoom.roomCode, user, profile });
    const freshRoom = await getRoomByCode(roomCode);
    if (freshRoom) {
      await updateDoc(doc(ensureDb(), "rooms", freshRoom.id), {
        matchmakingStatus:
          freshRoom.playerCount >= freshRoom.minPlayersToStart ? "ready" : "filling",
        updatedAt: serverTimestamp()
      });
      await updateDoc(queueRef(user.uid), {
        status: "matched",
        matchedRoomId: freshRoom.id,
        matchedRoomCode: roomCode,
        updatedAt: serverTimestamp()
      });
    }
    return { roomCode, createdRoom: false };
  }

  const quiz = await choosePlayableQuiz(preferences);
  const targetPlayers = playerTarget(preferences);
  const roomCode = await createRoom({
    user,
    profile,
    input: {
      source: "quick-match",
      roomTitle: `Quick Match: ${quiz.title}`,
      roomDescription: "A public casual matchmaking room with host-controlled rounds.",
      quizId: quiz.id,
      visibility: "public",
      locked: false,
      maxPlayers: targetPlayers,
      questionTimerSeconds: preferences.questionTimerSeconds,
      showCorrectAfterEachQuestion: false,
      allowLateJoin: false,
      requireReady: false,
      shuffleQuestions: true,
      shuffleOptions: true,
      autoAdvance: false,
      autoAdvanceDelaySeconds: 5,
      scoringMode: preferences.scoringMode,
      matchmakingEnabled: true,
      preferredPlayerCount: targetPlayers,
      minPlayersToStart: Math.min(2, targetPlayers),
      allowBotFill: preferences.allowBotFill,
      botFillDelaySeconds: 30,
      matchmakingStatus: "open",
      queueCreatedBy: user.uid,
      challengeId: null
    }
  });
  const room = await getRoomByCode(roomCode);
  await updateDoc(queueRef(user.uid), {
    status: "matched",
    matchedRoomId: room?.id ?? null,
    matchedRoomCode: roomCode,
    updatedAt: serverTimestamp()
  });
  return { roomCode, createdRoom: true };
}

export async function cancelQueue(userId: string) {
  const existing = await getActiveQueueEntry(userId).catch(() => null);
  await setDoc(
    queueRef(userId),
    {
      userId,
      status: "cancelled",
      antiAbuse: {
        cancelCount: (existing?.antiAbuse.cancelCount ?? 0) + 1,
        retryCount: existing?.antiAbuse.retryCount ?? 0,
        flags: existing?.antiAbuse.flags ?? []
      },
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function listRecentMatchmakingQueues(count = 50) {
  const snapshot = await getDocs(
    query(queueCollection(), orderBy("updatedAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapMatchmakingQueueEntry);
}

export async function expireQueue(userId: string) {
  await updateDoc(queueRef(userId), {
    status: "expired",
    updatedAt: serverTimestamp()
  });
}

export async function expireStaleQueues(count = 25) {
  const snapshot = await getDocs(
    query(queueCollection(), where("status", "==", "searching"), orderBy("expiresAt", "asc"), limit(count))
  );
  const now = Date.now();
  const stale = snapshot.docs.map(mapMatchmakingQueueEntry).filter((entry) => {
    return entry.expiresAt ? new Date(entry.expiresAt).getTime() < now : false;
  });

  await Promise.all(stale.map((entry) => expireQueue(entry.userId)));
  return stale.length;
}
