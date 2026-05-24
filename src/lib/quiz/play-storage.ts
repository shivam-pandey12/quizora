import type { QuizPlayState } from "@/types/domain";

function storageKey(userId: string, quizId: string) {
  return `quizora.play.${userId}.${quizId}`;
}

export function loadPlayState(userId: string, quizId: string): QuizPlayState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, quizId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizPlayState;
    if (parsed.quizId !== quizId || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayState(state: QuizPlayState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(state.userId, state.quizId), JSON.stringify(state));
}

export function clearPlayState(userId: string, quizId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId, quizId));
}
