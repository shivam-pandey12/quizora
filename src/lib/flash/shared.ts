import type {
  FlashAnswer,
  FlashPlayer,
  FlashQuestion,
  FlashQuiz,
  FlashResult,
  PlayQuestion,
  QuizAnswerState
} from "@/types/domain";

export const flashCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeFlashCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function flashPlayerId(flashQuizId: string, userId: string) {
  return `${flashQuizId}_${userId}`;
}

export function flashAnswerId(flashQuizId: string, questionIndex: number, userId: string) {
  return `${flashQuizId}_${questionIndex}_${userId}`;
}

export function flashResultId(flashQuizId: string, userId: string) {
  return `${flashQuizId}_${userId}`;
}

export function isFlashExpired(flashQuiz: Pick<FlashQuiz, "expiresAt" | "status">, now = new Date()) {
  if (flashQuiz.status === "expired" || flashQuiz.status === "archived") return true;
  if (!flashQuiz.expiresAt) return false;
  return new Date(flashQuiz.expiresAt).getTime() <= now.getTime();
}

export function safeFlashQuestion(question: FlashQuestion): PlayQuestion {
  return {
    id: question.id,
    quizId: question.flashQuizId,
    type: question.type,
    questionText: question.questionText,
    options: question.options,
    imageUrl: "",
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    order: question.order
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalized = new Set(left);
  return right.every((item) => normalized.has(item));
}

export function scoreFlashAnswer(question: FlashQuestion, answer: QuizAnswerState) {
  if (question.type === "multiple-choice") {
    const correctAnswers = question.correctAnswers.length
      ? question.correctAnswers
      : question.correctAnswer
        ? [question.correctAnswer]
        : [];
    const selected = answer.selectedAnswers.filter(Boolean);
    const isCorrect = selected.length > 0 && sameSet(selected, correctAnswers);
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      pointsPossible: question.points
    };
  }

  if (question.type === "text") {
    const isCorrect = Boolean(question.correctAnswer) && normalizeText(answer.textAnswer) === normalizeText(question.correctAnswer);
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      pointsPossible: question.points
    };
  }

  const selected = answer.selectedAnswer;
  const isCorrect = Boolean(selected) && selected === question.correctAnswer;
  return {
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    pointsPossible: question.points
  };
}

export function sortFlashPlayers(players: FlashPlayer[]) {
  return [...players].sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score;
    if (second.accuracy !== first.accuracy) return second.accuracy - first.accuracy;
    if (first.totalTimeSeconds !== second.totalTimeSeconds) return first.totalTimeSeconds - second.totalTimeSeconds;
    return (first.joinedAt ?? "").localeCompare(second.joinedAt ?? "");
  });
}

export function sortFlashResults(results: FlashResult[]) {
  return [...results].sort((first, second) => {
    if (first.rank && second.rank) return first.rank - second.rank;
    if (second.score !== first.score) return second.score - first.score;
    if (second.accuracy !== first.accuracy) return second.accuracy - first.accuracy;
    return first.totalTimeSeconds - second.totalTimeSeconds;
  });
}

export function answerDistribution(answers: FlashAnswer[]) {
  const counts = new Map<string, number>();
  answers.forEach((answer) => {
    const keys = answer.selectedAnswers.length ? answer.selectedAnswers : [answer.selectedAnswer || "skipped"];
    keys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  });
  return counts;
}
