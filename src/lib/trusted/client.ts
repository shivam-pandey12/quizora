import type { User } from "firebase/auth";
import type { PlayQuestion, QuizAnswerState } from "@/types/domain";

async function authHeaders(user: User) {
  const token = await user.getIdToken();
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Trusted Quizora request failed.");
  return data as T;
}

export interface TrustedAttemptStart {
  attemptSessionId: string;
  sessionToken: string;
  quiz: {
    id: string;
    slug: string;
    title: string;
    categoryId: string;
    categoryName: string;
    difficulty: string;
    timeLimitSeconds: number;
    totalPoints: number;
  };
  questions: PlayQuestion[];
  assignment: {
    assignmentId: string;
    assignmentTitle: string;
    classId: string;
    className: string;
    dueAt: string | null;
  } | null;
}

export async function startTrustedAttemptClient({
  user,
  quizId,
  assignmentId,
  classId
}: {
  user: User;
  quizId: string;
  assignmentId?: string;
  classId?: string;
}) {
  const response = await fetch("/api/attempts/start", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ quizId, assignmentId, classId })
  });
  return parseResponse<TrustedAttemptStart>(response);
}

export async function submitTrustedAttemptClient({
  user,
  attemptSessionId,
  sessionToken,
  answers,
  clientStartedAtMs,
  clientCompletedAtMs
}: {
  user: User;
  attemptSessionId: string;
  sessionToken: string;
  answers: Record<string, QuizAnswerState>;
  clientStartedAtMs: number;
  clientCompletedAtMs: number;
}) {
  const response = await fetch("/api/attempts/submit", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({
      attemptSessionId,
      sessionToken,
      answers,
      clientStartedAtMs,
      clientCompletedAtMs
    })
  });
  return parseResponse<{ attemptId: string; resultPath: string; duplicate: boolean }>(response);
}

export async function fetchSafeRoomQuestionsClient(user: User, roomId: string) {
  const response = await fetch(`/api/rooms/questions?roomId=${encodeURIComponent(roomId)}`, {
    headers: await authHeaders(user)
  });
  return parseResponse<{ questions: PlayQuestion[] }>(response);
}

export async function submitTrustedRoomAnswerClient({
  user,
  roomId,
  questionIndex,
  answer,
  botUserId
}: {
  user: User;
  roomId: string;
  questionIndex: number;
  answer?: QuizAnswerState;
  botUserId?: string;
}) {
  const response = await fetch("/api/rooms/submit-answer", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ roomId, questionIndex, answer, botUserId })
  });
  return parseResponse<{ ok: true }>(response);
}

export async function finalizeTrustedRoomQuestionClient({
  user,
  roomId
}: {
  user: User;
  roomId: string;
}) {
  const response = await fetch("/api/rooms/finalize-question", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ roomId })
  });
  return parseResponse<{ ok: true; completed: boolean }>(response);
}

export async function ensureTrustedRoomAttemptClient({
  user,
  roomId
}: {
  user: User;
  roomId: string;
}) {
  const response = await fetch("/api/rooms/finalize-room", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({ roomId })
  });
  return parseResponse<{ attemptId: string }>(response);
}
