import { isValidSlug } from "@/lib/firestore/slug";
import type {
  CategoryInput,
  QuestionInput,
  Quiz,
  QuizInput
} from "@/types/domain";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function result(errors: Record<string, string>): ValidationResult {
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCategoryInput(input: CategoryInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Category name is required.";
  if (!input.slug.trim()) errors.slug = "Slug is required.";
  if (input.slug && !isValidSlug(input.slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }
  if (!input.description.trim()) errors.description = "Description is required.";
  if (!input.icon.trim()) errors.icon = "Icon label is required.";
  if (!input.accent.trim()) errors.accent = "Accent class is required.";
  return result(errors);
}

export function validateQuizInput(input: QuizInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "Quiz title is required.";
  if (!input.slug.trim()) errors.slug = "Slug is required.";
  if (input.slug && !isValidSlug(input.slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }
  if (!input.categoryId) errors.categoryId = "Choose a category.";
  if (!input.description.trim()) errors.description = "Full description is required.";
  if (!input.shortDescription.trim()) {
    errors.shortDescription = "Short description is required.";
  }
  if (input.estimatedMinutes <= 0) errors.estimatedMinutes = "Estimated minutes must be positive.";
  if (input.timeLimitSeconds < 0) errors.timeLimitSeconds = "Time limit cannot be negative.";
  return result(errors);
}

export function validatePublishReady(quiz: Quiz, activeQuestionCount: number): ValidationResult {
  const base = validateQuizInput({
    title: quiz.title,
    slug: quiz.slug,
    description: quiz.description,
    shortDescription: quiz.shortDescription,
    categoryId: quiz.categoryId,
    categoryName: quiz.categoryName,
    difficulty: quiz.difficulty,
    status: quiz.status,
    visibility: quiz.visibility,
    thumbnailUrl: quiz.thumbnailUrl,
    tags: quiz.tags,
    estimatedMinutes: quiz.estimatedMinutes,
    timeLimitSeconds: quiz.timeLimitSeconds,
    isFeatured: quiz.isFeatured,
    isDailyChallenge: quiz.isDailyChallenge,
    createdBy: quiz.createdBy,
    ownerId: quiz.ownerId,
    ownerName: quiz.ownerName,
    ownerType: quiz.ownerType,
    publishScope: quiz.publishScope,
    reviewStatus: quiz.reviewStatus,
    allowedClassIds: quiz.allowedClassIds
  });
  const errors = { ...base.errors };
  if (activeQuestionCount < 1) {
    errors.questions = "Add at least one active question before publishing.";
  }
  return result(errors);
}

export function validateQuestionInput(input: QuestionInput): ValidationResult {
  const errors: Record<string, string> = {};
  const activeOptions = input.options.filter((option) => option.text.trim());

  if (!input.questionText.trim()) errors.questionText = "Question text is required.";
  if (input.points <= 0) errors.points = "Points must be positive.";
  if (input.timeLimitSeconds < 0) errors.timeLimitSeconds = "Time limit cannot be negative.";

  if (input.type === "single-choice" || input.type === "multiple-choice") {
    if (activeOptions.length < 2) errors.options = "Add at least two answer options.";
  }

  if (input.type === "single-choice" || input.type === "true-false") {
    if (!input.correctAnswer) errors.correctAnswer = "Choose the correct answer.";
    if (
      input.correctAnswer &&
      !activeOptions.some((option) => option.id === input.correctAnswer)
    ) {
      errors.correctAnswer = "Correct answer must match an option.";
    }
  }

  if (input.type === "multiple-choice") {
    if (input.correctAnswers.length < 1) {
      errors.correctAnswers = "Choose at least one correct answer.";
    }
    if (
      input.correctAnswers.some(
        (answerId) => !activeOptions.some((option) => option.id === answerId)
      )
    ) {
      errors.correctAnswers = "All correct answers must match active options.";
    }
  }

  return result(errors);
}
