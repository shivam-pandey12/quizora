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
  where,
  type Unsubscribe
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import {
  mapFlashAnswer,
  mapFlashPlayer,
  mapFlashQuestion,
  mapFlashQuiz,
  mapFlashReport,
  mapFlashResult
} from "@/lib/firestore/mappers";
import { normalizeFlashCode } from "@/lib/flash/shared";
import type {
  FlashAnswer,
  FlashPlayer,
  FlashQuiz,
  FlashResult,
  PlayQuestion,
  QuizAnswerState
} from "@/types/domain";

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function getCollection(
  name:
    | "flashQuizzes"
    | "flashQuestions"
    | "flashPlayers"
    | "flashAnswers"
    | "flashResults"
    | "flashReports"
) {
  return collection(ensureDb(), name);
}

async function authHeaders(user: User) {
  const token = await user.getIdToken();
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as { error?: string })
    : {};
  if (!response.ok) throw new Error(data.error || "Flash Quiz request failed.");
  return data as T;
}

export async function getFlashQuizByCode(flashCode: string) {
  const snapshot = await getDocs(
    query(
      getCollection("flashQuizzes"),
      where("flashCode", "==", normalizeFlashCode(flashCode)),
      limit(1)
    )
  );
  return snapshot.empty ? null : mapFlashQuiz(snapshot.docs[0]);
}

export async function getFlashQuizById(flashQuizId: string) {
  const snapshot = await getDoc(doc(ensureDb(), "flashQuizzes", flashQuizId));
  return snapshot.exists() ? mapFlashQuiz(snapshot) : null;
}

export function listenFlashQuizByCode(
  flashCode: string,
  onNext: (flashQuiz: FlashQuiz | null) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("flashQuizzes"),
      where("flashCode", "==", normalizeFlashCode(flashCode)),
      limit(1)
    ),
    (snapshot) => onNext(snapshot.empty ? null : mapFlashQuiz(snapshot.docs[0])),
    (error) => onError(error.message)
  );
}

export function listenFlashQuizById(
  flashQuizId: string,
  onNext: (flashQuiz: FlashQuiz | null) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    doc(ensureDb(), "flashQuizzes", flashQuizId),
    (snapshot) => onNext(snapshot.exists() ? mapFlashQuiz(snapshot) : null),
    (error) => onError(error.message)
  );
}

export function listenFlashPlayers(
  flashQuizId: string,
  onNext: (players: FlashPlayer[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("flashPlayers"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("joinedAt", "asc"),
      limit(160)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapFlashPlayer)),
    (error) => onError(error.message)
  );
}

export function listenFlashAnswers(
  flashQuizId: string,
  questionIndex: number,
  onNext: (answers: FlashAnswer[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("flashAnswers"),
      where("flashQuizId", "==", flashQuizId),
      where("questionIndex", "==", questionIndex),
      limit(220)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapFlashAnswer)),
    (error) => onError(error.message)
  );
}

export function listenFlashResults(
  flashQuizId: string,
  onNext: (results: FlashResult[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    query(
      getCollection("flashResults"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("rank", "asc"),
      limit(220)
    ),
    (snapshot) => onNext(snapshot.docs.map(mapFlashResult)),
    (error) => onError(error.message)
  );
}

export async function listFlashQuestions(flashQuizId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("flashQuestions"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("order", "asc"),
      limit(260)
    )
  );
  return snapshot.docs.map(mapFlashQuestion);
}

export async function listFlashReports(flashQuizId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("flashReports"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("createdAt", "desc"),
      limit(80)
    )
  );
  return snapshot.docs.map(mapFlashReport);
}

export async function listUserFlashHistory(userId: string, count = 12) {
  const [hostedSnapshot, resultsSnapshot, joinedSnapshot] = await Promise.all([
    getDocs(
      query(
        getCollection("flashQuizzes"),
        where("hostId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(count)
      )
    ),
    getDocs(
      query(
        getCollection("flashResults"),
        where("userId", "==", userId),
        orderBy("completedAt", "desc"),
        limit(count)
      )
    ),
    getDocs(
      query(
        getCollection("flashPlayers"),
        where("userId", "==", userId),
        orderBy("joinedAt", "desc"),
        limit(count)
      )
    )
  ]);

  return {
    hosted: hostedSnapshot.docs.map(mapFlashQuiz),
    results: resultsSnapshot.docs.map(mapFlashResult),
    joined: joinedSnapshot.docs.map(mapFlashPlayer)
  };
}

export async function listRecentAdminFlashQuizzes(count = 80) {
  const snapshot = await getDocs(
    query(getCollection("flashQuizzes"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapFlashQuiz);
}

export async function listFlashPlayersOnce(flashQuizId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("flashPlayers"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("joinedAt", "asc"),
      limit(200)
    )
  );
  return snapshot.docs.map(mapFlashPlayer);
}

export async function listFlashResultsOnce(flashQuizId: string) {
  const snapshot = await getDocs(
    query(
      getCollection("flashResults"),
      where("flashQuizId", "==", flashQuizId),
      orderBy("rank", "asc"),
      limit(200)
    )
  );
  return snapshot.docs.map(mapFlashResult);
}

export async function createFlashQuizClient(user: User, payload: unknown) {
  const response = await fetch("/api/flash/create", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify(payload)
  });
  return parseResponse<{ flashQuizId: string; flashCode: string; hostPath: string }>(response);
}

export async function lookupFlashQuizClient(user: User, flashCode: string) {
  const response = await fetch(`/api/flash/lookup?flashCode=${encodeURIComponent(normalizeFlashCode(flashCode))}`, {
    headers: await authHeaders(user)
  });
  return parseResponse<{ flashQuiz: FlashQuiz }>(response);
}

export async function joinFlashQuizClient(user: User, flashCode: string) {
  const response = await fetch("/api/flash/join", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashCode })
  });
  return parseResponse<{ flashQuizId: string; flashCode: string; playPath: string; hostPath?: string }>(response);
}

export async function fetchSafeFlashQuestionsClient(user: User, flashQuizId: string) {
  const response = await fetch(`/api/flash/questions?flashQuizId=${encodeURIComponent(flashQuizId)}`, {
    headers: await authHeaders(user)
  });
  return parseResponse<{ questions: PlayQuestion[] }>(response);
}

export async function startFlashQuizClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/flash/start", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  return parseResponse<{ ok: true }>(response);
}

export async function submitFlashAnswerClient({
  user,
  flashQuizId,
  questionIndex,
  answer
}: {
  user: User;
  flashQuizId: string;
  questionIndex: number;
  answer: QuizAnswerState;
}) {
  const response = await fetch("/api/flash/submit-answer", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId, questionIndex, answer })
  });
  return parseResponse<{ ok: true; completed?: boolean; resultPath?: string }>(response);
}

export async function advanceFlashQuizClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/flash/advance", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  return parseResponse<{ ok: true; completed: boolean }>(response);
}

export async function finalizeFlashQuizClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/flash/finalize", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  return parseResponse<{ ok: true }>(response);
}

export async function extendFlashQuizClient(user: User, flashQuizId: string, expiryHours: number) {
  const response = await fetch("/api/flash/extend", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId, expiryHours })
  });
  return parseResponse<{ ok: true; expiresAt: string }>(response);
}

export async function convertFlashQuizClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/flash/convert-to-draft", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  return parseResponse<{ quizId: string; editPath: string }>(response);
}

export async function reportFlashQuizClient(user: User, flashQuizId: string, reason: string, details: string) {
  const response = await fetch("/api/flash/report", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId, reason, details })
  });
  return parseResponse<{ ok: true }>(response);
}

export async function exportFlashResultsClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/flash/export", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Flash export failed.");
  }
  return response.text();
}

export async function archiveFlashQuizClient(user: User, flashQuizId: string) {
  const response = await fetch("/api/admin/flash/archive", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ flashQuizId })
  });
  return parseResponse<{ ok: true }>(response);
}
