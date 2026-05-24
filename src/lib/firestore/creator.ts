import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { mapQuiz } from "@/lib/firestore/mappers";
import { createSlug } from "@/lib/firestore/slug";
import { validateQuizInput } from "@/lib/firestore/validation";
import type { Category, CreatorStatus, Quiz, QuizInput, UserProfile } from "@/types/domain";

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

export async function listCreatorQuizzes(ownerId: string): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "quizzes"),
      where("ownerId", "==", ownerId),
      orderBy("updatedAt", "desc"),
      limit(80)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

async function slugAvailable(slug: string) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "quizzes"), where("slug", "==", slug), limit(1))
  );
  return snapshot.empty;
}

export function creatorQuizDraftInput({
  user,
  profile,
  category,
  title
}: {
  user: User;
  profile: UserProfile | null;
  category: Category;
  title: string;
}): QuizInput {
  return {
    title,
    slug: `${createSlug(title)}-${Date.now().toString(36)}`,
    description: "Class-only quiz draft created from the creator workspace.",
    shortDescription: "Class-only quiz draft.",
    categoryId: category.id,
    categoryName: category.name,
    difficulty: "easy",
    status: "draft",
    visibility: "private",
    thumbnailUrl: "",
    tags: ["classroom"],
    estimatedMinutes: 8,
    timeLimitSeconds: 0,
    isFeatured: false,
    isDailyChallenge: false,
    createdBy: user.uid,
    ownerId: user.uid,
    ownerName: profile?.displayName || user.displayName || user.email || "Quizora Creator",
    ownerType: "creator",
    publishScope: "class-only",
    reviewStatus: "draft",
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

export async function submitCreatorQuizForReview(quizId: string) {
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    reviewStatus: "submitted",
    updatedAt: serverTimestamp()
  });
}

export async function reviewCreatorQuiz(quizId: string, reviewStatus: "approved" | "rejected") {
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    reviewStatus,
    updatedAt: serverTimestamp()
  });
}
