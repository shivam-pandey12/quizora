import type {
  AttemptAnswer,
  Question,
  QuizAnswerState,
  ScoreResult
} from "@/types/domain";

export function sameSet(first: string[], second: string[]) {
  if (first.length !== second.length) return false;
  const normalizedFirst = [...first].sort();
  const normalizedSecond = [...second].sort();
  return normalizedFirst.every((value, index) => value === normalizedSecond[index]);
}

export function isSkippedAnswer(answer: QuizAnswerState | undefined) {
  if (!answer) return true;
  return (
    !answer.selectedAnswer &&
    answer.selectedAnswers.length === 0 &&
    !answer.textAnswer.trim()
  );
}

export function scoreQuizAttempt(
  questions: Question[],
  answers: Record<string, QuizAnswerState>
): ScoreResult {
  const scoredAnswers: AttemptAnswer[] = questions.map((question) => {
    const answer = answers[question.id];
    const skipped = isSkippedAnswer(answer);
    let isCorrect = false;

    if (!skipped) {
      if (question.type === "single-choice" || question.type === "true-false") {
        isCorrect = answer?.selectedAnswer === question.correctAnswer;
      }

      if (question.type === "multiple-choice") {
        isCorrect = sameSet(answer?.selectedAnswers ?? [], question.correctAnswers);
      }

      if (question.type === "text" && question.correctAnswer) {
        isCorrect =
          answer?.textAnswer.trim().toLowerCase() ===
          question.correctAnswer.trim().toLowerCase();
      }
    }

    return {
      questionId: question.id,
      questionTextSnapshot: question.questionText,
      type: question.type,
      selectedAnswer:
        question.type === "text" ? answer?.textAnswer.trim() ?? "" : answer?.selectedAnswer ?? "",
      selectedAnswers: answer?.selectedAnswers ?? [],
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      pointsPossible: question.points,
      timeSpentSeconds: Math.max(0, answer?.timeSpentSeconds ?? 0),
      explanationSnapshot: question.explanation,
      optionsSnapshot: question.options
    };
  });

  const score = scoredAnswers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const correctCount = scoredAnswers.filter((answer) => answer.isCorrect).length;
  const skippedCount = scoredAnswers.filter(
    (answer) =>
      !answer.selectedAnswer &&
      answer.selectedAnswers.length === 0
  ).length;
  const wrongCount = scoredAnswers.length - correctCount - skippedCount;
  const totalQuestions = questions.length;
  const accuracy = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    answers: scoredAnswers,
    score,
    totalPoints,
    correctCount,
    wrongCount,
    skippedCount,
    totalQuestions,
    accuracy
  };
}

export function scoreSingleQuestion(question: Question, answer: QuizAnswerState | undefined) {
  const skipped = isSkippedAnswer(answer);
  let isCorrect = false;

  if (!skipped) {
    if (question.type === "single-choice" || question.type === "true-false") {
      isCorrect = answer?.selectedAnswer === question.correctAnswer;
    }

    if (question.type === "multiple-choice") {
      isCorrect = sameSet(answer?.selectedAnswers ?? [], question.correctAnswers);
    }

    if (question.type === "text" && question.correctAnswer) {
      isCorrect =
        answer?.textAnswer.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase();
    }
  }

  return {
    skipped,
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    pointsPossible: question.points
  };
}
