import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapChallenge } from "@/lib/firestore/mappers";
import { createRoom, getRoomByCode, joinRoomByCode } from "@/lib/firestore/rooms";
import type { Challenge, RoomScoringMode, UserProfile } from "@/types/domain";

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function challengeRef(challengeId: string) {
  return doc(ensureDb(), "challenges", challengeId);
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const snapshot = await getDoc(challengeRef(challengeId));
  return snapshot.exists() ? mapChallenge(snapshot) : null;
}

export async function createChallengeForQuiz({
  user,
  profile,
  quizId,
  quizTitle,
  scoringMode = "standard"
}: {
  user: User;
  profile: UserProfile | null;
  quizId: string;
  quizTitle: string;
  scoringMode?: RoomScoringMode;
}) {
  const clientDb = ensureDb();
  const ref = doc(collection(clientDb, "challenges"));
  const roomCode = await createRoom({
    user,
    profile,
    input: {
      source: "challenge",
      roomTitle: `Challenge: ${quizTitle}`,
      roomDescription: "A private Quizora challenge room shared through a challenge invite link.",
      quizId,
      visibility: "private",
      locked: false,
      maxPlayers: 4,
      questionTimerSeconds: 30,
      showCorrectAfterEachQuestion: false,
      allowLateJoin: false,
      requireReady: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      autoAdvance: false,
      autoAdvanceDelaySeconds: 5,
      scoringMode,
      matchmakingEnabled: false,
      preferredPlayerCount: 2,
      minPlayersToStart: 1,
      allowBotFill: false,
      challengeId: ref.id
    }
  });
  const room = await getRoomByCode(roomCode);
  if (!room) throw new Error("Challenge room was created but could not be loaded.");

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const creatorName = profile?.displayName || user.displayName || user.email || "Quizora Player";
  const batch = writeBatch(clientDb);
  batch.set(ref, {
    createdBy: user.uid,
    createdByName: creatorName,
    quizId,
    quizTitle,
    roomId: room.id,
    roomCode,
    status: "active",
    expiresAt,
    acceptedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.update(doc(clientDb, "rooms", room.id), {
    challengeId: ref.id,
    updatedAt: serverTimestamp()
  });
  await batch.commit();

  return {
    challengeId: ref.id,
    roomCode
  };
}

export async function joinChallenge({
  challenge,
  user,
  profile
}: {
  challenge: Challenge;
  user: User;
  profile: UserProfile | null;
}) {
  if (challenge.status === "expired" || challenge.status === "cancelled") {
    throw new Error("This challenge is no longer available.");
  }
  if (challenge.expiresAt && new Date(challenge.expiresAt).getTime() < Date.now()) {
    await updateDoc(challengeRef(challenge.id), {
      status: "expired",
      updatedAt: serverTimestamp()
    });
    throw new Error("This challenge link has expired.");
  }

  const roomCode = await joinRoomByCode({ roomCode: challenge.roomCode, user, profile });
  await updateDoc(challengeRef(challenge.id), {
    status: "joined",
    acceptedBy: user.uid,
    updatedAt: serverTimestamp()
  });
  return roomCode;
}

export async function cancelChallenge(challengeId: string) {
  await updateDoc(challengeRef(challengeId), {
    status: "cancelled",
    updatedAt: serverTimestamp()
  });
}
