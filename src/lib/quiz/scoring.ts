import type {
  AttemptAnswer,
  Question,
  QuizAnswerState,
  ScoreResult
} from "@/types/domain";
import {
  isSkippedAnswer as isSkippedAnswerByType,
  normalizeQuestion,
  scoreQuestionAnswer
} from "@/lib/quiz/question-engine";

export function sameSet(first: string[], second: string[]) {
  if (first.length !== second.length) return false;
  const normalizedFirst = [...first].sort();
  const normalizedSecond = [...second].sort();
  return normalizedFirst.every((value, index) => value === normalizedSecond[index]);
}

export function isSkippedAnswer(answer: QuizAnswerState | undefined) {
  return isSkippedAnswerByType(answer);
}

export function scoreQuizAttempt(
  questions: Question[],
  answers: Record<string, QuizAnswerState>
): ScoreResult {
  const scoredAnswers: AttemptAnswer[] = questions.map((question) => {
    const answer = answers[question.id];
    const normalizedQuestion = normalizeQuestion(question);
    const scored = scoreQuestionAnswer(normalizedQuestion, answer);

    return {
      questionId: normalizedQuestion.id,
      questionTextSnapshot: normalizedQuestion.questionText,
      type: normalizedQuestion.type,
      selectedAnswer: scored.selectedAnswer,
      selectedAnswers: scored.selectedAnswers,
      correctAnswer: scored.correctAnswer,
      correctAnswers: scored.correctAnswers,
      selectedAnswerSummary: scored.selectedAnswerSummary,
      correctAnswerSummary: scored.correctAnswerSummary,
      textAnswer: scored.textAnswer,
      numericAnswer: scored.numericAnswer,
      blankAnswers: scored.blankAnswers,
      correctBlankAnswers: scored.correctBlankAnswers,
      matchingAnswers: scored.matchingAnswers,
      correctMatchingAnswers: scored.correctMatchingAnswers,
      orderingAnswerIds: scored.orderingAnswerIds,
      correctOrderIds: scored.correctOrderIds,
      skipped: scored.skipped,
      isCorrect: scored.isCorrect,
      pointsEarned: scored.pointsEarned,
      pointsPossible: scored.pointsPossible,
      timeSpentSeconds: Math.max(0, answer?.timeSpentSeconds ?? 0),
      explanationSnapshot: normalizedQuestion.explanation,
      questionImageUrl: normalizedQuestion.imageUrl,
      questionImageAlt: normalizedQuestion.imageAlt,
      questionImageCaption: normalizedQuestion.imageCaption,
      optionsSnapshot: normalizedQuestion.options,
      blanksSnapshot: normalizedQuestion.blanks,
      matchPairsSnapshot: normalizedQuestion.matchPairs,
      orderItemsSnapshot: normalizedQuestion.orderItems,
      unit: normalizedQuestion.unit,
      tolerance: normalizedQuestion.tolerance,
      passageTitle: normalizedQuestion.passageTitle,
      passageText: normalizedQuestion.passageText,
      assertionText: normalizedQuestion.assertionText,
      reasonText: normalizedQuestion.reasonText
    };
  });

  const score = scoredAnswers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const correctCount = scoredAnswers.filter((answer) => answer.isCorrect).length;
  const skippedCount = scoredAnswers.filter((answer) => answer.skipped).length;
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
  const scored = scoreQuestionAnswer(question, answer);

  return {
    skipped: scored.skipped,
    isCorrect: scored.isCorrect,
    pointsEarned: scored.pointsEarned,
    pointsPossible: scored.pointsPossible
  };
}
