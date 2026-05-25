import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapAttempt, mapCategory, mapQuestion, mapQuiz } from "@/lib/firestore/mappers";
import {
  validateCategoryInput,
  validatePublishReady,
  validateQuestionInput,
  validateQuizInput
} from "@/lib/firestore/validation";
import type {
  AdminCounts,
  Category,
  CategoryInput,
  Question,
  QuestionInput,
  Quiz,
  QuizInput,
  QuizStatus
} from "@/types/domain";

const adminListLimit = 200;
const publicListLimit = 80;
const quizQuestionLimit = 250;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function getCollection(
  name:
    | "categories"
    | "quizzes"
    | "questions"
    | "users"
    | "attempts"
    | "rooms"
    | "classes"
    | "reports"
    | "feedback"
    | "matchmakingQueue"
) {
  return collection(ensureDb(), name);
}

async function isSlugAvailable(
  collectionName: "categories" | "quizzes",
  slug: string,
  excludeId?: string
) {
  const snapshot = await getDocs(
    query(getCollection(collectionName), where("slug", "==", slug), limit(1))
  );
  return snapshot.empty || snapshot.docs[0]?.id === excludeId;
}

export async function listAdminCategories(): Promise<Category[]> {
  const snapshot = await getDocs(
    query(getCollection("categories"), orderBy("name", "asc"), limit(adminListLimit))
  );
  return snapshot.docs.map(mapCategory);
}

export async function listPublicCategories(): Promise<Category[]> {
  const snapshot = await getDocs(
    query(
      getCollection("categories"),
      where("status", "==", "active"),
      orderBy("featured", "desc"),
      orderBy("name", "asc"),
      limit(publicListLimit)
    )
  );
  return snapshot.docs.map(mapCategory);
}

export async function getPublicCategoryBySlug(slug: string): Promise<Category | null> {
  const snapshot = await getDocs(
    query(
      getCollection("categories"),
      where("slug", "==", slug),
      where("status", "==", "active"),
      limit(1)
    )
  );
  return snapshot.empty ? null : mapCategory(snapshot.docs[0]);
}

export async function getPublicCategoryById(categoryId: string): Promise<Category | null> {
  const snapshot = await getDoc(doc(ensureDb(), "categories", categoryId));
  if (!snapshot.exists()) return null;
  const category = mapCategory(snapshot);
  return category.status === "active" ? category : null;
}

export async function createCategory(input: CategoryInput) {
  const validation = validateCategoryInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await isSlugAvailable("categories", input.slug))) {
    throw new Error("That category slug is already in use.");
  }

  const ref = await addDoc(getCollection("categories"), {
    ...input,
    quizCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const validation = validateCategoryInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await isSlugAvailable("categories", input.slug, id))) {
    throw new Error("That category slug is already in use.");
  }

  await updateDoc(doc(ensureDb(), "categories", id), {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function setCategoryStatus(id: string, status: Category["status"]) {
  await updateDoc(doc(ensureDb(), "categories", id), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function deleteCategorySafely(id: string): Promise<"deleted" | "hidden"> {
  const usedSnapshot = await getDocs(
    query(getCollection("quizzes"), where("categoryId", "==", id), limit(1))
  );

  if (!usedSnapshot.empty) {
    await setCategoryStatus(id, "hidden");
    return "hidden";
  }

  await deleteDoc(doc(ensureDb(), "categories", id));
  return "deleted";
}

export async function recalculateCategoryQuizCount(categoryId: string) {
  if (!categoryId) return;
  const [publishedSnapshot, draftSnapshot] = await Promise.all([
    getCountFromServer(
      query(
        getCollection("quizzes"),
        where("categoryId", "==", categoryId),
        where("status", "==", "published")
      )
    ),
    getCountFromServer(
      query(
        getCollection("quizzes"),
        where("categoryId", "==", categoryId),
        where("status", "==", "draft")
      )
    )
  ]);
  const quizCount = publishedSnapshot.data().count + draftSnapshot.data().count;

  await updateDoc(doc(ensureDb(), "categories", categoryId), {
    quizCount,
    updatedAt: serverTimestamp()
  });
}

export async function listAdminQuizzes(): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(getCollection("quizzes"), orderBy("updatedAt", "desc"), limit(adminListLimit))
  );
  return snapshot.docs.map(mapQuiz);
}

export async function listPublicQuizzes(): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      getCollection("quizzes"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      orderBy("publishedAt", "desc"),
      limit(publicListLimit)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

export async function listPublicQuizzesByCategory(categoryId: string): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      getCollection("quizzes"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      where("categoryId", "==", categoryId),
      orderBy("publishedAt", "desc"),
      limit(publicListLimit)
    )
  );
  return snapshot.docs.map(mapQuiz);
}

export async function getPublicQuizBySlug(slug: string): Promise<Quiz | null> {
  const snapshot = await getDocs(
    query(
      getCollection("quizzes"),
      where("slug", "==", slug),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      limit(1)
    )
  );
  return snapshot.empty ? null : mapQuiz(snapshot.docs[0]);
}

export async function getAdminQuiz(id: string): Promise<Quiz | null> {
  const snapshot = await getDoc(doc(ensureDb(), "quizzes", id));
  return snapshot.exists() ? mapQuiz(snapshot) : null;
}

export async function createQuiz(input: QuizInput) {
  const validation = validateQuizInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await isSlugAvailable("quizzes", input.slug))) {
    throw new Error("That quiz slug is already in use.");
  }

  const ref = await addDoc(getCollection("quizzes"), {
    ...input,
    questionCount: 0,
    totalPoints: 0,
    playCount: 0,
    averageScore: 0,
    publishedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await recalculateCategoryQuizCount(input.categoryId);
  return ref.id;
}

export async function updateQuiz(id: string, input: QuizInput) {
  const validation = validateQuizInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await isSlugAvailable("quizzes", input.slug, id))) {
    throw new Error("That quiz slug is already in use.");
  }

  const existing = await getAdminQuiz(id);
  await updateDoc(doc(ensureDb(), "quizzes", id), {
    ...input,
    updatedAt: serverTimestamp()
  });

  if (existing?.categoryId && existing.categoryId !== input.categoryId) {
    await recalculateCategoryQuizCount(existing.categoryId);
  }
  await recalculateCategoryQuizCount(input.categoryId);
}

export async function setQuizStatus(id: string, status: QuizStatus) {
  const payload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp()
  };
  if (status === "published") payload.publishedAt = serverTimestamp();
  if (status !== "published") payload.publishedAt = null;
  await updateDoc(doc(ensureDb(), "quizzes", id), payload);
}

export async function publishQuiz(id: string) {
  await refreshQuizQuestionStats(id);
  const quiz = await getAdminQuiz(id);
  if (!quiz) throw new Error("Quiz not found.");
  const activeQuestionCount = await getActiveQuestionCount(id);
  const validation = validatePublishReady(quiz, activeQuestionCount);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!(await isSlugAvailable("quizzes", quiz.slug, id))) {
    throw new Error("That quiz slug is already in use.");
  }
  await setQuizStatus(id, "published");
}

export async function archiveQuiz(id: string) {
  const quiz = await getAdminQuiz(id);
  await setQuizStatus(id, "archived");
  if (quiz?.categoryId) await recalculateCategoryQuizCount(quiz.categoryId);
}

export async function listQuestionsForQuiz(quizId: string): Promise<Question[]> {
  const snapshot = await getDocs(
    query(
      getCollection("questions"),
      where("quizId", "==", quizId),
      orderBy("order", "asc"),
      limit(quizQuestionLimit)
    )
  );
  return snapshot.docs.map(mapQuestion);
}

export async function getActiveQuestionCount(quizId: string) {
  const questions = await listQuestionsForQuiz(quizId);
  return questions.filter((question) => question.status === "active").length;
}

export async function refreshQuizQuestionStats(quizId: string) {
  const questions = await listQuestionsForQuiz(quizId);
  const active = questions.filter((question) => question.status === "active");
  const totalPoints = active.reduce((sum, question) => sum + question.points, 0);
  await updateDoc(doc(ensureDb(), "quizzes", quizId), {
    questionCount: active.length,
    totalPoints,
    updatedAt: serverTimestamp()
  });
}

export async function createQuestion(input: QuestionInput) {
  const validation = validateQuestionInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);

  const ref = await addDoc(getCollection("questions"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await refreshQuizQuestionStats(input.quizId);
  return ref.id;
}

export async function updateQuestion(id: string, input: QuestionInput) {
  const validation = validateQuestionInput(input);
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);

  await updateDoc(doc(ensureDb(), "questions", id), {
    ...input,
    updatedAt: serverTimestamp()
  });
  await refreshQuizQuestionStats(input.quizId);
}

export async function setQuestionStatus(id: string, quizId: string, status: Question["status"]) {
  await updateDoc(doc(ensureDb(), "questions", id), {
    status,
    updatedAt: serverTimestamp()
  });
  await refreshQuizQuestionStats(quizId);
}

export async function deleteQuestion(id: string, quizId: string) {
  await deleteDoc(doc(ensureDb(), "questions", id));
  await refreshQuizQuestionStats(quizId);
}

export async function reorderQuestions(quizId: string, orderedIds: string[]) {
  const batch = writeBatch(ensureDb());
  orderedIds.forEach((id, index) => {
    batch.update(doc(ensureDb(), "questions", id), {
      order: index + 1,
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
  await refreshQuizQuestionStats(quizId);
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [
    totalQuizzes,
    publishedQuizzes,
    draftQuizzes,
    totalCategories,
    totalUsers,
    totalQuestions,
    featuredQuizzes,
    dailyChallengeQuizzes,
    totalAttempts,
    attemptsToday,
    totalRooms,
    activeRooms,
    completedRoomsToday,
    quickMatchesToday,
    pendingReports,
    pendingFeedback,
    activeQueues,
    totalClasses,
    activeClasses,
    approvedCreators,
    recentAttempts
  ] = await Promise.all([
    getCountFromServer(getCollection("quizzes")),
    getCountFromServer(query(getCollection("quizzes"), where("status", "==", "published"))),
    getCountFromServer(query(getCollection("quizzes"), where("status", "==", "draft"))),
    getCountFromServer(getCollection("categories")),
    getCountFromServer(getCollection("users")),
    getCountFromServer(getCollection("questions")),
    getCountFromServer(query(getCollection("quizzes"), where("isFeatured", "==", true))),
    getCountFromServer(query(getCollection("quizzes"), where("isDailyChallenge", "==", true))),
    getCountFromServer(getCollection("attempts")),
    getCountFromServer(query(getCollection("attempts"), where("completedAt", ">=", today))),
    getCountFromServer(getCollection("rooms")),
    getCountFromServer(query(getCollection("rooms"), where("status", "==", "in-progress"))),
    getCountFromServer(
      query(
        getCollection("rooms"),
        where("status", "==", "completed"),
        where("completedAt", ">=", today)
      )
    ),
    getCountFromServer(
      query(
        getCollection("rooms"),
        where("source", "==", "quick-match"),
        where("createdAt", ">=", today)
      )
    ),
    getCountFromServer(query(getCollection("reports"), where("status", "in", ["open", "reviewing"]))),
    getCountFromServer(query(getCollection("feedback"), where("status", "in", ["new", "reviewing"]))),
    getCountFromServer(query(getCollection("matchmakingQueue"), where("status", "==", "searching"))),
    getCountFromServer(getCollection("classes")),
    getCountFromServer(query(getCollection("classes"), where("status", "==", "active"))),
    getCountFromServer(query(getCollection("users"), where("creatorStatus", "==", "approved"))),
    getDocs(query(getCollection("attempts"), orderBy("completedAt", "desc"), limit(100)))
  ]);
  const mappedAttempts = recentAttempts.docs.map(mapAttempt);
  const averageAccuracy = mappedAttempts.length
    ? Math.round(
        mappedAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) /
          mappedAttempts.length
      )
    : 0;

  return {
    totalQuizzes: totalQuizzes.data().count,
    publishedQuizzes: publishedQuizzes.data().count,
    draftQuizzes: draftQuizzes.data().count,
    totalCategories: totalCategories.data().count,
    totalUsers: totalUsers.data().count,
    totalQuestions: totalQuestions.data().count,
    featuredQuizzes: featuredQuizzes.data().count,
    dailyChallengeQuizzes: dailyChallengeQuizzes.data().count,
    totalAttempts: totalAttempts.data().count,
    attemptsToday: attemptsToday.data().count,
    averageAccuracy,
    totalRooms: totalRooms.data().count,
    activeRooms: activeRooms.data().count,
    completedRoomsToday: completedRoomsToday.data().count,
    quickMatchesToday: quickMatchesToday.data().count,
    pendingReports: pendingReports.data().count,
    pendingFeedback: pendingFeedback.data().count,
    activeQueues: activeQueues.data().count,
    totalClasses: totalClasses.data().count,
    activeClasses: activeClasses.data().count,
    approvedCreators: approvedCreators.data().count
  };
}
