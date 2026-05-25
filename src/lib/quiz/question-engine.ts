import type {
  MatchPair,
  OrderItem,
  PlayQuestion,
  Question,
  QuestionBlank,
  QuestionInput,
  QuestionOption,
  QuestionType,
  QuizAnswerState
} from "@/types/domain";

export const basicQuestionTypes = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "short-answer"
] as const;

export const advancedQuestionTypes = [
  "numeric",
  "fill-blank",
  "matching",
  "ordering",
  "assertion-reason",
  "passage"
] as const;

export const permanentQuestionTypes: QuestionType[] = [
  ...basicQuestionTypes,
  ...advancedQuestionTypes
];

export const flashQuestionTypes: QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "short-answer"
];

export const optionQuestionTypes: QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "assertion-reason",
  "passage"
];

export const creatorMaxOptions = 8;
export const adminMaxOptions = 10;
export const defaultOptionCount = 4;

const optionLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type QuestionLike = Record<string, unknown> & {
  id?: string;
  quizId?: string;
  options?: unknown;
  type?: unknown;
};

export interface QuestionValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface ScoredQuestionAnswer {
  skipped: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  selectedAnswer: string;
  selectedAnswers: string[];
  correctAnswer: string;
  correctAnswers: string[];
  selectedAnswerSummary: string;
  correctAnswerSummary: string;
  textAnswer: string;
  numericAnswer: string;
  blankAnswers: Record<string, string>;
  correctBlankAnswers: Record<string, string[]>;
  matchingAnswers: Record<string, string>;
  correctMatchingAnswers: Record<string, string>;
  orderingAnswerIds: string[];
  correctOrderIds: string[];
}

export function normalizeQuestionType(value: unknown): QuestionType {
  if (value === "multiple-choice") return "multiple-choice";
  if (value === "true-false") return "true-false";
  if (value === "short-answer" || value === "text") return value;
  if (value === "numeric") return "numeric";
  if (value === "fill-blank") return "fill-blank";
  if (value === "matching") return "matching";
  if (value === "ordering") return "ordering";
  if (value === "assertion-reason") return "assertion-reason";
  if (value === "passage") return "passage";
  return "single-choice";
}

export function getQuestionTypeLabel(type: QuestionType) {
  if (type === "single-choice") return "Single choice";
  if (type === "multiple-choice") return "Multiple choice";
  if (type === "true-false") return "True / false";
  if (type === "short-answer" || type === "text") return "Short answer";
  if (type === "numeric") return "Numeric";
  if (type === "fill-blank") return "Fill in the blank";
  if (type === "matching") return "Matching";
  if (type === "ordering") return "Ordering";
  if (type === "assertion-reason") return "Assertion reason";
  return "Passage";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeText(value: string, caseSensitive = false, trimWhitespace = true) {
  let next = trimWhitespace ? value.trim().replace(/\s+/g, " ") : value;
  if (!caseSensitive) next = next.toLowerCase();
  return next;
}

function nextOptionId(index: number) {
  return optionLabels[index] ? optionLabels[index].toLowerCase() : `opt-${index + 1}`;
}

export function makeQuestionOption(text = "", index = 0): QuestionOption {
  const label = optionLabels[index] ?? String(index + 1);
  return {
    id: `${label.toLowerCase()}-${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`,
    label,
    text,
    imageUrl: "",
    imagePath: "",
    imageAlt: ""
  };
}

export function makeDefaultOptions(count = defaultOptionCount): QuestionOption[] {
  return Array.from({ length: count }, (_, index) => ({
    id: nextOptionId(index),
    label: optionLabels[index] ?? String(index + 1),
    text: "",
    imageUrl: "",
    imagePath: "",
    imageAlt: ""
  }));
}

export function trueFalseOptions(): QuestionOption[] {
  return [
    { id: "true", label: "A", text: "True", imageUrl: "", imagePath: "", imageAlt: "" },
    { id: "false", label: "B", text: "False", imageUrl: "", imagePath: "", imageAlt: "" }
  ];
}

export function assertionReasonOptions(): QuestionOption[] {
  return [
    { id: "both-true-reason-explains", label: "A", text: "Both are true, and the reason explains the assertion.", imageUrl: "", imagePath: "", imageAlt: "" },
    { id: "both-true-not-explain", label: "B", text: "Both are true, but the reason does not explain the assertion.", imageUrl: "", imagePath: "", imageAlt: "" },
    { id: "assertion-true-reason-false", label: "C", text: "The assertion is true, but the reason is false.", imageUrl: "", imagePath: "", imageAlt: "" },
    { id: "assertion-false-reason-true", label: "D", text: "The assertion is false, but the reason is true.", imageUrl: "", imagePath: "", imageAlt: "" }
  ];
}

export function normalizeOptions(options: unknown, fallbackCount = defaultOptionCount): QuestionOption[] {
  const raw = Array.isArray(options) ? options : [];
  const mapped = raw
    .map((option, index) => {
      if (typeof option === "string") {
        return {
          id: nextOptionId(index),
          label: optionLabels[index] ?? String(index + 1),
          text: option,
          imageUrl: "",
          imagePath: "",
          imageAlt: ""
        };
      }
      const data = asRecord(option);
      const text = asString(data.text);
      const imageUrl = asString(data.imageUrl);
      return {
        id: asString(data.id, nextOptionId(index)),
        label: asString(data.label, optionLabels[index] ?? String(index + 1)),
        text,
        imageUrl,
        imagePath: asString(data.imagePath),
        imageAlt: asString(data.imageAlt),
        isCorrect: asBoolean(data.isCorrect)
      };
    })
    .filter((option) => option.id && (option.text.trim() || option.imageUrl.trim()));

  return mapped.length ? mapped : makeDefaultOptions(fallbackCount);
}

export function normalizeBlanks(value: unknown): QuestionBlank[] {
  return Array.isArray(value)
    ? value
        .map((item, index) => {
          const data = asRecord(item);
          return {
            id: asString(data.id, `blank-${index + 1}`),
            label: asString(data.label, `Blank ${index + 1}`),
            acceptableAnswers: asStringArray(data.acceptableAnswers).filter(Boolean),
            caseSensitive: asBoolean(data.caseSensitive)
          };
        })
        .filter((blank) => blank.id)
    : [];
}

export function normalizeMatchPairs(value: unknown): MatchPair[] {
  return Array.isArray(value)
    ? value
        .map((item, index) => {
          const data = asRecord(item);
          return {
            id: asString(data.id, `pair-${index + 1}`),
            left: asString(data.left),
            right: asString(data.right)
          };
        })
        .filter((pair) => pair.id && pair.left.trim() && pair.right.trim())
    : [];
}

export function normalizeOrderItems(value: unknown): OrderItem[] {
  return Array.isArray(value)
    ? value
        .map((item, index) => {
          if (typeof item === "string") return { id: `item-${index + 1}`, text: item };
          const data = asRecord(item);
          return {
            id: asString(data.id, `item-${index + 1}`),
            text: asString(data.text)
          };
        })
        .filter((item) => item.id && item.text.trim())
    : [];
}

export function normalizeQuestion(questionValue: unknown): Question {
  const question = asRecord(questionValue) as QuestionLike;
  const type = normalizeQuestionType(question.type);
  const options =
    type === "true-false"
      ? trueFalseOptions()
      : type === "assertion-reason"
        ? normalizeOptions(question.options, 4).length >= 4
          ? normalizeOptions(question.options, 4)
          : assertionReasonOptions()
        : normalizeOptions(question.options, type === "single-choice" || type === "multiple-choice" || type === "passage" ? defaultOptionCount : 0);
  const correctAnswer = asString((question as Record<string, unknown>).correctAnswer);
  const correctAnswers = asStringArray((question as Record<string, unknown>).correctAnswers);
  const correctOptionId = asString(
    (question as Record<string, unknown>).correctOptionId,
    correctAnswer
  );
  const correctOptionIds = asStringArray((question as Record<string, unknown>).correctOptionIds);
  const correctText = asString(
    (question as Record<string, unknown>).correctText,
    type === "short-answer" || type === "text" ? correctAnswer : ""
  );
  const blanks = normalizeBlanks((question as Record<string, unknown>).blanks);
  const matchPairs = normalizeMatchPairs((question as Record<string, unknown>).matchPairs);
  const orderItems = normalizeOrderItems((question as Record<string, unknown>).orderItems);
  const correctOrderIds = asStringArray((question as Record<string, unknown>).correctOrderIds);

  return {
    ...question,
    id: asString(question.id),
    quizId: asString((question as Record<string, unknown>).quizId),
    type,
    questionText: asString((question as Record<string, unknown>).questionText),
    options,
    correctAnswer: correctOptionId || correctAnswer,
    correctAnswers: correctOptionIds.length ? correctOptionIds : correctAnswers,
    correctOptionId: correctOptionId || correctAnswer,
    correctOptionIds: correctOptionIds.length ? correctOptionIds : correctAnswers,
    correctText,
    acceptableAnswers: asStringArray((question as Record<string, unknown>).acceptableAnswers),
    caseSensitive: asBoolean((question as Record<string, unknown>).caseSensitive),
    trimWhitespace: asBoolean((question as Record<string, unknown>).trimWhitespace, true),
    correctNumber:
      typeof (question as Record<string, unknown>).correctNumber === "number"
        ? ((question as Record<string, unknown>).correctNumber as number)
        : null,
    tolerance:
      typeof (question as Record<string, unknown>).tolerance === "number"
        ? ((question as Record<string, unknown>).tolerance as number)
        : 0,
    unit: asString((question as Record<string, unknown>).unit),
    allowEquivalentUnits: asBoolean((question as Record<string, unknown>).allowEquivalentUnits),
    blanks,
    blankScoring: "all-or-nothing",
    matchPairs,
    shuffleRight: asBoolean((question as Record<string, unknown>).shuffleRight, true),
    orderItems,
    correctOrderIds: correctOrderIds.length ? correctOrderIds : orderItems.map((item) => item.id),
    assertionText: asString((question as Record<string, unknown>).assertionText),
    reasonText: asString((question as Record<string, unknown>).reasonText),
    passageTitle: asString((question as Record<string, unknown>).passageTitle),
    passageText: asString((question as Record<string, unknown>).passageText),
    passageImageUrl: asString((question as Record<string, unknown>).passageImageUrl),
    passageImageAlt: asString((question as Record<string, unknown>).passageImageAlt),
    explanation: asString((question as Record<string, unknown>).explanation),
    imageUrl: asString((question as Record<string, unknown>).imageUrl),
    imagePath: asString((question as Record<string, unknown>).imagePath),
    imageAlt: asString((question as Record<string, unknown>).imageAlt),
    imageCaption: asString((question as Record<string, unknown>).imageCaption),
    points: asNumber((question as Record<string, unknown>).points, 1),
    timeLimitSeconds: asNumber((question as Record<string, unknown>).timeLimitSeconds, 30),
    order: asNumber((question as Record<string, unknown>).order, 1),
    status: (question as Record<string, unknown>).status === "hidden" ? "hidden" : "active",
    createdAt: (question as Record<string, unknown>).createdAt as string | null,
    updatedAt: (question as Record<string, unknown>).updatedAt as string | null
  } as Question;
}

export function getDefaultQuestionByType({
  quizId,
  order,
  type = "single-choice"
}: {
  quizId: string;
  order: number;
  type?: QuestionType;
}): QuestionInput {
  const base = {
    quizId,
    type,
    questionText: "",
    options: makeDefaultOptions(),
    correctAnswer: "",
    correctAnswers: [],
    correctOptionId: "",
    correctOptionIds: [],
    correctText: "",
    acceptableAnswers: [],
    caseSensitive: false,
    trimWhitespace: true,
    correctNumber: null,
    tolerance: 0,
    unit: "",
    allowEquivalentUnits: false,
    blanks: [{ id: "blank-1", label: "Blank 1", acceptableAnswers: [], caseSensitive: false }],
    blankScoring: "all-or-nothing" as const,
    matchPairs: [
      { id: "pair-1", left: "", right: "" },
      { id: "pair-2", left: "", right: "" }
    ],
    shuffleRight: true,
    orderItems: [
      { id: "item-1", text: "" },
      { id: "item-2", text: "" },
      { id: "item-3", text: "" }
    ],
    correctOrderIds: ["item-1", "item-2", "item-3"],
    assertionText: "",
    reasonText: "",
    passageTitle: "",
    passageText: "",
    passageImageUrl: "",
    passageImageAlt: "",
    explanation: "",
    imageUrl: "",
    imagePath: "",
    imageAlt: "",
    imageCaption: "",
    points: 2,
    timeLimitSeconds: 30,
    order,
    status: "active" as const
  };

  if (type === "true-false") {
    return { ...base, options: trueFalseOptions(), correctAnswer: "true", correctOptionId: "true" };
  }
  if (type === "assertion-reason") {
    return { ...base, options: assertionReasonOptions(), correctAnswer: "", correctOptionId: "" };
  }
  if (type === "short-answer" || type === "text") {
    return { ...base, options: [], correctAnswer: "" };
  }
  if (type === "numeric" || type === "fill-blank" || type === "matching" || type === "ordering") {
    return { ...base, options: [] };
  }
  return base;
}

function optionLabel(question: Question, optionId: string) {
  const option = question.options.find((item) => item.id === optionId);
  return option?.text || option?.imageAlt || option?.label || optionId;
}

function summaryList(values: string[]) {
  return values.length ? values.join(", ") : "Skipped";
}

function answerSetEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((item) => leftSet.has(item));
}

function normalizeSelected(answer: QuizAnswerState | undefined) {
  return {
    selectedAnswer: answer?.selectedOptionId || answer?.selectedAnswer || "",
    selectedAnswers: answer?.selectedOptionIds?.length ? answer.selectedOptionIds : answer?.selectedAnswers ?? [],
    textAnswer: answer?.textAnswer ?? "",
    numericAnswer: answer?.numericAnswer ?? "",
    blankAnswers: answer?.blankAnswers ?? {},
    matchingAnswers: answer?.matchingAnswers ?? {},
    orderingAnswerIds: answer?.orderingAnswerIds ?? []
  };
}

export function isSkippedAnswer(answer: QuizAnswerState | undefined, question?: unknown) {
  if (!answer) return true;
  const questionData = asRecord(question);
  const type = normalizeQuestionType(questionData.type ?? "single-choice");
  const normalized = normalizeSelected(answer);
  if (type === "multiple-choice") return normalized.selectedAnswers.length === 0;
  if (type === "short-answer" || type === "text") return !normalized.textAnswer.trim();
  if (type === "numeric") return !normalized.numericAnswer.trim();
  if (type === "fill-blank") return !Object.values(normalized.blankAnswers).some((value) => value.trim());
  if (type === "matching") return !Object.values(normalized.matchingAnswers).some(Boolean);
  if (type === "ordering") return normalized.orderingAnswerIds.length === 0;
  return !normalized.selectedAnswer;
}

export function scoreQuestionAnswer(questionLike: unknown, answer: QuizAnswerState | undefined): ScoredQuestionAnswer {
  const question = normalizeQuestion(questionLike);
  const answerValue = normalizeSelected(answer);
  const skipped = isSkippedAnswer(answer, question);
  let isCorrect = false;
  let selectedAnswer = "";
  let selectedAnswers: string[] = [];
  let correctAnswer = "";
  let correctAnswers: string[] = [];
  let selectedAnswerSummary = "Skipped";
  let correctAnswerSummary = "";
  const correctBlankAnswers: Record<string, string[]> = {};
  const correctMatchingAnswers: Record<string, string> = {};

  if (question.type === "multiple-choice") {
    selectedAnswers = answerValue.selectedAnswers.filter(Boolean);
    correctAnswers = question.correctOptionIds?.length ? question.correctOptionIds : question.correctAnswers;
    isCorrect = !skipped && answerSetEqual(selectedAnswers, correctAnswers);
    selectedAnswerSummary = summaryList(selectedAnswers.map((id) => optionLabel(question, id)));
    correctAnswerSummary = summaryList(correctAnswers.map((id) => optionLabel(question, id)));
  } else if (question.type === "short-answer" || question.type === "text") {
    const caseSensitive = question.caseSensitive ?? false;
    const trimWhitespace = question.trimWhitespace ?? true;
    const accepted = [question.correctText || question.correctAnswer, ...(question.acceptableAnswers ?? [])]
      .filter(Boolean)
      .map((item) => normalizeText(item, caseSensitive, trimWhitespace));
    const candidate = normalizeText(answerValue.textAnswer, caseSensitive, trimWhitespace);
    isCorrect = !skipped && accepted.includes(candidate);
    selectedAnswer = answerValue.textAnswer.trim();
    selectedAnswerSummary = selectedAnswer || "Skipped";
    correctAnswer = question.correctText || question.correctAnswer;
    correctAnswerSummary = question.acceptableAnswers?.length
      ? [correctAnswer, ...question.acceptableAnswers].filter(Boolean).join(" / ")
      : correctAnswer || "Short answer";
  } else if (question.type === "numeric") {
    const candidate = Number.parseFloat(answerValue.numericAnswer);
    const correctNumber = typeof question.correctNumber === "number" ? question.correctNumber : Number.NaN;
    const tolerance = Math.max(0, question.tolerance ?? 0);
    isCorrect = !skipped && Number.isFinite(candidate) && Number.isFinite(correctNumber) && Math.abs(candidate - correctNumber) <= tolerance;
    selectedAnswer = answerValue.numericAnswer.trim();
    selectedAnswerSummary = selectedAnswer ? `${selectedAnswer}${question.unit ? ` ${question.unit}` : ""}` : "Skipped";
    correctAnswer = Number.isFinite(correctNumber) ? String(correctNumber) : "";
    correctAnswerSummary = correctAnswer
      ? `${correctAnswer}${question.unit ? ` ${question.unit}` : ""}${tolerance ? ` (tolerance ${tolerance})` : ""}`
      : "Numeric answer";
  } else if (question.type === "fill-blank") {
    const blanks = question.blanks ?? [];
    const allCorrect = blanks.length > 0 && blanks.every((blank) => {
      const userValue = normalizeText(answerValue.blankAnswers[blank.id] ?? "", blank.caseSensitive ?? false, true);
      const accepted = blank.acceptableAnswers.map((item) => normalizeText(item, blank.caseSensitive ?? false, true));
      correctBlankAnswers[blank.id] = blank.acceptableAnswers;
      return userValue && accepted.includes(userValue);
    });
    isCorrect = !skipped && allCorrect;
    selectedAnswerSummary = blanks.length
      ? blanks.map((blank) => `${blank.label}: ${answerValue.blankAnswers[blank.id] || "blank"}`).join("; ")
      : "Skipped";
    correctAnswerSummary = blanks.length
      ? blanks.map((blank) => `${blank.label}: ${(correctBlankAnswers[blank.id] ?? []).join(" / ")}`).join("; ")
      : "Fill in the blank";
  } else if (question.type === "matching") {
    const pairs = question.matchPairs ?? [];
    const rightItems = matchingRightDisplayItems(question);
    const correctDisplayIds = Object.fromEntries(rightItems.map((item) => [item.pairId, item.id]));
    pairs.forEach((pair) => {
      correctMatchingAnswers[pair.id] = correctDisplayIds[pair.id] ?? pair.id;
    });
    isCorrect =
      !skipped &&
      pairs.length > 0 &&
      pairs.every((pair) => {
        const selected = answerValue.matchingAnswers[pair.id];
        return selected === pair.id || selected === correctDisplayIds[pair.id];
      });
    selectedAnswerSummary = pairs.length
      ? pairs.map((pair) => {
          const selected = answerValue.matchingAnswers[pair.id];
          const selectedText = rightItems.find((item) => item.id === selected)?.text
            || pairs.find((item) => item.id === selected)?.right;
          return `${pair.left} -> ${selectedText || "not matched"}`;
        }).join("; ")
      : "Skipped";
    correctAnswerSummary = pairs.length
      ? pairs.map((pair) => `${pair.left} -> ${pair.right}`).join("; ")
      : "Matching";
  } else if (question.type === "ordering") {
    const correct = question.correctOrderIds?.length ? question.correctOrderIds : question.orderItems?.map((item) => item.id) ?? [];
    const selected = answerValue.orderingAnswerIds;
    isCorrect = !skipped && answerSetEqual(selected, correct) && selected.every((id, index) => id === correct[index]);
    selectedAnswerSummary = selected.length
      ? selected.map((id) => question.orderItems?.find((item) => item.id === id)?.text || id).join(" -> ")
      : "Skipped";
    correctAnswerSummary = correct.length
      ? correct.map((id) => question.orderItems?.find((item) => item.id === id)?.text || id).join(" -> ")
      : "Ordering";
  } else {
    selectedAnswer = answerValue.selectedAnswer;
    correctAnswer = question.correctOptionId || question.correctAnswer;
    isCorrect = !skipped && Boolean(selectedAnswer) && selectedAnswer === correctAnswer;
    selectedAnswerSummary = selectedAnswer ? optionLabel(question, selectedAnswer) : "Skipped";
    correctAnswerSummary = correctAnswer ? optionLabel(question, correctAnswer) : "Correct answer";
  }

  return {
    skipped,
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    pointsPossible: question.points,
    selectedAnswer,
    selectedAnswers,
    correctAnswer,
    correctAnswers,
    selectedAnswerSummary,
    correctAnswerSummary,
    textAnswer: answerValue.textAnswer.trim(),
    numericAnswer: answerValue.numericAnswer.trim(),
    blankAnswers: answerValue.blankAnswers,
    correctBlankAnswers,
    matchingAnswers: answerValue.matchingAnswers,
    correctMatchingAnswers,
    orderingAnswerIds: answerValue.orderingAnswerIds,
    correctOrderIds: question.correctOrderIds ?? []
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle<T>(items: T[], seed: string) {
  if (items.length <= 1) return [...items];
  const shuffled = items
    .map((item, index) => ({
      item,
      originalIndex: index,
      rank: stableHash(`${seed}:${index}:${JSON.stringify(item)}`)
    }))
    .sort((first, second) => first.rank - second.rank || first.originalIndex - second.originalIndex)
    .map(({ item }) => item);

  if (shuffled.every((item, index) => Object.is(item, items[index]))) {
    return [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}

function matchingRightDisplayItems(question: Question) {
  const raw = (question.matchPairs ?? []).map((pair) => ({
    pairId: pair.id,
    text: pair.right
  }));

  return stableShuffle(raw, question.id || question.questionText).map((item, index) => ({
    id: `right-${index + 1}`,
    pairId: item.pairId,
    text: item.text
  }));
}

export function getSafeQuestionPayload(questionLike: unknown): PlayQuestion {
  const question = normalizeQuestion(questionLike);
  const matchPairs = question.matchPairs ?? [];
  const matchingRightItems = matchingRightDisplayItems(question).map(({ id, text }) => ({ id, text }));
  return {
    id: question.id,
    quizId: question.quizId,
    type: question.type,
    questionText: question.questionText,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      text: option.text,
      imageUrl: option.imageUrl,
      imagePath: option.imagePath,
      imageAlt: option.imageAlt
    })),
    imageUrl: question.imageUrl,
    imageAlt: question.imageAlt,
    imageCaption: question.imageCaption,
    unit: question.unit,
    blanks: question.blanks?.map((blank) => ({ id: blank.id, label: blank.label })),
    matchingLeftItems: matchPairs.map((pair) => ({ id: pair.id, text: pair.left })),
    matchingRightItems,
    orderItems: stableShuffle(question.orderItems ?? [], question.id || question.questionText),
    assertionText: question.assertionText,
    reasonText: question.reasonText,
    passageTitle: question.passageTitle,
    passageText: question.passageText,
    passageImageUrl: question.passageImageUrl,
    passageImageAlt: question.passageImageAlt,
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    order: question.order
  };
}

export function validateQuestionByType(inputLike: unknown, options: { maxOptions?: number } = {}): QuestionValidationResult {
  const maxOptions = options.maxOptions ?? adminMaxOptions;
  const question = normalizeQuestion(inputLike);
  const errors: Record<string, string> = {};
  const activeOptions = question.options.filter((option) => option.text.trim() || option.imageUrl?.trim());

  if (!question.questionText.trim()) errors.questionText = "Question text is required.";
  if (question.points <= 0) errors.points = "Points must be positive.";
  if (question.timeLimitSeconds < 0) errors.timeLimitSeconds = "Time limit cannot be negative.";
  if (question.imageUrl?.trim() && !question.imageAlt?.trim()) errors.imageAlt = "Add alt text for the question image.";
  if (activeOptions.some((option) => option.imageUrl?.trim() && !option.imageAlt?.trim())) {
    errors.options = "Add alt text for every option image.";
  }

  const needsOptions = optionQuestionTypes.includes(question.type) || question.type === "true-false";
  if (needsOptions && question.type !== "true-false") {
    if (activeOptions.length < 2) errors.options = "Add at least two answer options.";
    if (activeOptions.length > maxOptions) errors.options = `Use ${maxOptions} options or fewer.`;
  }

  if (question.type === "single-choice" || question.type === "passage" || question.type === "assertion-reason" || question.type === "true-false") {
    const answer = question.correctOptionId || question.correctAnswer;
    if (!answer) errors.correctAnswer = "Choose the correct answer.";
    if (answer && !activeOptions.some((option) => option.id === answer)) {
      errors.correctAnswer = "Correct answer must match an option.";
    }
  }

  if (question.type === "multiple-choice") {
    const answers = question.correctOptionIds?.length ? question.correctOptionIds : question.correctAnswers;
    if (!answers.length) errors.correctAnswers = "Choose at least one correct answer.";
    if (answers.some((answerId) => !activeOptions.some((option) => option.id === answerId))) {
      errors.correctAnswers = "All correct answers must match active options.";
    }
  }

  if (question.type === "short-answer" || question.type === "text") {
    if (!(question.correctText || question.correctAnswer || question.acceptableAnswers?.length)) {
      errors.correctText = "Add the accepted short answer.";
    }
  }

  if (question.type === "numeric") {
    if (typeof question.correctNumber !== "number" || !Number.isFinite(question.correctNumber)) {
      errors.correctNumber = "Add the correct number.";
    }
    if ((question.tolerance ?? 0) < 0) errors.tolerance = "Tolerance cannot be negative.";
  }

  if (question.type === "fill-blank") {
    const blanks = question.blanks ?? [];
    if (!blanks.length) errors.blanks = "Add at least one blank.";
    if (blanks.some((blank) => !blank.acceptableAnswers.length)) {
      errors.blanks = "Each blank needs at least one accepted answer.";
    }
  }

  if (question.type === "matching") {
    const pairs = question.matchPairs ?? [];
    if (pairs.length < 2) errors.matchPairs = "Add at least two matching pairs.";
  }

  if (question.type === "ordering") {
    const items = question.orderItems ?? [];
    const correct = question.correctOrderIds?.length ? question.correctOrderIds : items.map((item) => item.id);
    if (items.length < 2) errors.orderItems = "Add at least two ordering items.";
    if (correct.length !== items.length || correct.some((id) => !items.some((item) => item.id === id))) {
      errors.correctOrderIds = "Ordering answer must include every item once.";
    }
  }

  if (question.type === "assertion-reason") {
    if (!question.assertionText?.trim()) errors.assertionText = "Add the assertion.";
    if (!question.reasonText?.trim()) errors.reasonText = "Add the reason.";
  }

  if (question.type === "passage") {
    if (!question.passageText?.trim()) errors.passageText = "Add the passage text.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
