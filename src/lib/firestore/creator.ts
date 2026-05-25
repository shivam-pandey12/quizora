import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapCreatorRequest, mapQuestion, mapQuiz } from "@/lib/firestore/mappers";
import { createSlug } from "@/lib/firestore/slug";
import { validateQuizInput } from "@/lib/firestore/validation";
import {
  creatorMaxOptions,
  normalizeQuestion,
  optionQuestionTypes,
  trueFalseOptions,
  validateQuestionByType
} from "@/lib/quiz/question-engine";
import type {
  Category,
  CreatorRequest,
  CreatorRequestStatus,
  CreatorStatus,
  Question,
  QuestionInput,
  Quiz,
  QuizDifficulty,
  QuizInput,
  QuizPublishScope,
  UserProfile
} from "@/types/domain";

const creatorQuizLimit = 120;
const creatorQuestionLimit = 250;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

export function canUseCreatorTools(profile: UserProfile | null) {
  return hasAdminAccess({ profile }) || profile?.creatorStatus === "approved";
}

export async function updateCreatorStatus(userId: string, status: CreatorStatus) {
  await updateDoc(doc(ensureDb(), "users", userId), {
    creatorStatus: status,
    "teacherProfile.updatedAt": serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getCreatorRequest(userId: string): Promise<CreatorRequest | null> {
  const snapshot = await getDoc(doc(ensureDb(), "creatorRequests", userId));
  return snapshot.exists() ? mapCreatorRequest(snapshot) : null;
}

export async function listAdminCreatorRequests(
  status: CreatorRequestStatus | "all" = "all"
): Promise<CreatorRequest[]> {
  const base = collection(ensureDb(), "creatorRequests");
  const snapshot = await getDocs(
    status === "all"
      ? query(base, orderBy("createdAt", "desc"), limit(120))
      : query(base, where("status", "==", status), orderBy("createdAt", "desc"), limit(120))
  );
  return snapshot.docs.map(mapCreatorRequest);
}

export async function createCreatorRequest({
  user,
  profile,
  reason,
  interests,
  experience,
  intendedUse,
  agreementAccepted
}: {
  user: User;
  profile: UserProfile | null;
  reason: string;
  interests: string;
  experience: string;
  intendedUse: string;
  agreementAccepted: boolean;
}) {
  if (!reason.trim()) throw new Error("Tell us why you want creator access.");
  if (!interests.trim()) throw new Error("Add at least one topic interest.");
  if (!intendedUse.trim()) throw new Error("Choose how you plan to use creator tools.");
  if (!agreementAccepted) {
    throw new Error("Confirm that your quiz content will be original, safe, and accurate.");
  }

  const existing = await getCreatorRequest(user.uid);
  if (existing?.status === "pending") throw new Error("Your creator request is already pending.");
  if (existing?.status === "approved") throw new Error("You already have creator access.");
  if (existing?.status === "rejected") {
    throw new Error("Your previous creator request was reviewed. Contact support if you want to request another review.");
  }

  await setDoc(doc(ensureDb(), "creatorRequests", user.uid), {
    userId: user.uid,
    displayName: profile?.displayName || user.displayName || "Quizora learner",
    email: profile?.email || user.email || "",
    photoURL: profile?.photoURL || user.photoURL || null,
    reason: reason.trim(),
    interests: interests.trim(),
    experience: experience.trim(),
    intendedUse: intendedUse.trim(),
    agreementAccepted: true,
    status: "pending",
    adminNote: "",
    reviewedBy: "",
    reviewedByName: "",
    reviewedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function listCreatorQuizzes(ownerId: string): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "quizzes"),
      where("ownerId", "==", ownerId),
      orderBy("updatedAt", "desc"),
      limit(creatorQuizLimit)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

export async function listSubmittedCreatorQuizzes(): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "quizzes"),
      where("ownerType", "==", "creator"),
      where("reviewStatus", "==", "submitted"),
      orderBy("submittedAt", "desc"),
      limit(120)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

export async function listAllCreatorQuizzesForAdmin(): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "quizzes"),
      where("ownerType", "==", "creator"),
      orderBy("updatedAt", "desc"),
      limit(160)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

export async function getCreatorQuiz(quizId: string): Promise<Quiz | null> {
  const snapshot = await getDoc(doc(ensureDb(), "quizzes", quizId));
  return snapshot.exists() ? mapQuiz(snapshot) : null;
}

async function slugAvailable(slug: string, excludeId?: string) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "quizzes"), where("slug", "==", slug), limit(1))
  );
  return snapshot.empty || snapshot.docs[0]?.id === excludeId;
}

export function creatorQuizDraftInput({
  user,
  profile,
  category,
  title,
  slug,
  shortDescription,
  description,
  difficulty = "easy",
  tags = [],
  estimatedMinutes = 8,
  timeLimitSeconds = 0,
  publishScope = "private"
}: {
  user: User;
  profile: UserProfile | null;
  category: Category;
  title: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  difficulty?: QuizDifficulty;
  tags?: string[];
  estimatedMinutes?: number;
  timeLimitSeconds?: number;
  publishScope?: QuizPublishScope;
}): QuizInput {
  const cleanTitle = title.trim();
  const cleanSlug = createSlug(slug || cleanTitle);
  return {
    title: cleanTitle,
    slug: cleanSlug,
    description: description?.trim() || "A creator-owned Quizora draft.",
    shortDescription: shortDescription?.trim() || "Creator quiz draft.",
    categoryId: category.id,
    categoryName: category.name,
    difficulty,
    status: "draft",
    visibility: "private",
    thumbnailUrl: "",
    coverImageUrl: "",
    coverImagePath: "",
    coverImageAlt: "",
    coverImageCaption: "",
    tags,
    estimatedMinutes,
    timeLimitSeconds,
    isFeatured: false,
    isDailyChallenge: false,
    createdBy: user.uid,
    updatedBy: user.uid,
    ownerId: user.uid,
    ownerName: profile?.displayName || user.displayName || user.email || "Quizora Creator",
    ownerEmail: profile?.email || user.email || "",
    ownerType: "creator",
    publishScope,
    reviewStatus: "draft",
    rejectionNote: "",
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: "",
    reviewedByName: "",
    approvedAt: null,
    approvedBy: "",
    creatorEditable: true,
    allowedClassIds: []
  };
}

export async function createCreatorQuizDraft(input: QuizInput) {
  if (!input.ownerId) throw new Error("Creator owner is required.");
  const validation = validateQuizInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await slugAvailable(input.slug))) throw new Error("That quiz slug is already in use.");

  const ref = await addDoc(collection(ensureDb(), "quizzes"), {
    ...input,
    questionCount: 0,
    totalPoints: 0,
    playCount: 0,
    averageScore: 0,
    publishedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(ensureDb(), "users", input.ownerId), {
    creatorQuizCount: increment(1),
    lastCreatorActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateCreatorQuizDraft(quizId: string, input: QuizInput) {
  const validation = validateQuizInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await slugAvailable(input.slug, quizId))) throw new Error("That quiz slug is already in use.");

  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    ...input,
    status: "draft",
    visibility: "private",
    reviewStatus: "draft",
    updatedAt: serverTimestamp()
  });
}

export async function archiveCreatorQuiz(quizId: string, userId: string) {
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    status: "archived",
    visibility: "private",
    updatedBy: userId,
    updatedAt: serverTimestamp()
  });
}

export async function listCreatorQuestions(quizId: string): Promise<Question[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "questions"),
      where("quizId", "==", quizId),
      orderBy("order", "asc"),
      limit(creatorQuestionLimit)
    )
  );
  return snapshot.docs.map(mapQuestion);
}

export function creatorQuestionInput(input: QuestionInput): QuestionInput {
  const normalized = normalizeQuestion(input);
  const options =
    normalized.type === "true-false"
      ? trueFalseOptions()
      : optionQuestionTypes.includes(normalized.type) || normalized.type === "multiple-choice"
        ? normalized.options.filter((option) => option.text.trim() || option.imageUrl?.trim()).slice(0, creatorMaxOptions)
        : [];
  const correctOptionIds = (normalized.correctOptionIds ?? normalized.correctAnswers ?? []).filter((answer) =>
    options.some((option) => option.id === answer)
  );
  const correctOptionId =
    options.some((option) => option.id === (normalized.correctOptionId || normalized.correctAnswer))
      ? normalized.correctOptionId || normalized.correctAnswer
      : "";

  return {
    ...normalized,
    options,
    correctOptionId,
    correctOptionIds,
    correctAnswers:
      normalized.type === "multiple-choice"
        ? correctOptionIds
        : [],
    correctAnswer:
      normalized.type === "multiple-choice" ? "" : correctOptionId || normalized.correctText || normalized.correctAnswer,
    explanation: normalized.explanation.trim(),
    questionText: normalized.questionText.trim()
  };
}

async function refreshCreatorQuizStats(quizId: string) {
  const questions = await listCreatorQuestions(quizId);
  const active = questions.filter((question) => question.status === "active");
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    questionCount: active.length,
    totalPoints: active.reduce((sum, question) => sum + question.points, 0),
    updatedAt: serverTimestamp()
  });
}

export async function createCreatorQuestion(input: QuestionInput) {
  const normalized = creatorQuestionInput(input);
  const validation = validateQuestionByType(normalized, { maxOptions: creatorMaxOptions });
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!normalized.explanation) throw new Error("Add an explanation before saving.");

  const ref = await addDoc(collection(ensureDb(), "questions"), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await refreshCreatorQuizStats(normalized.quizId);
  return ref.id;
}

export async function updateCreatorQuestion(questionId: string, input: QuestionInput) {
  const normalized = creatorQuestionInput(input);
  const validation = validateQuestionByType(normalized, { maxOptions: creatorMaxOptions });
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!normalized.explanation) throw new Error("Add an explanation before saving.");

  await updateDoc(doc(ensureDb(), "questions", questionId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
  await refreshCreatorQuizStats(normalized.quizId);
}

export async function deleteCreatorQuestion(questionId: string, quizId: string) {
  await deleteDoc(doc(ensureDb(), "questions", questionId));
  await refreshCreatorQuizStats(quizId);
}

export async function submitCreatorQuizForReview(quizId: string, idToken?: string) {
  if (!idToken) throw new Error("Sign in again before submitting this quiz.");
  const response = await fetch("/api/creator/quizzes/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ quizId })
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Could not submit this quiz.");
}

export async function reviewCreatorQuiz(
  quizId: string,
  reviewStatus: "approved" | "rejected"
) {
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    reviewStatus,
    updatedAt: serverTimestamp()
  });
}
