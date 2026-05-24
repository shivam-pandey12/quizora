import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { createCategory, createQuestion, createQuiz } from "@/lib/firestore/content";
import { toIso } from "@/lib/firestore/timestamps";
import type {
  Category,
  CategoryInput,
  DailyChallenge,
  FeaturedConfig,
  QuestionInput,
  Quiz,
  QuizInput,
  SiteSettings
} from "@/types/domain";

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
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

export function mapDailyChallenge(id: string, data: Record<string, unknown>): DailyChallenge {
  return {
    id,
    dateKey: asString(data.dateKey, id),
    quizId: asString(data.quizId),
    quizTitle: asString(data.quizTitle),
    categoryId: asString(data.categoryId),
    difficulty:
      data.difficulty === "medium" ||
      data.difficulty === "hard" ||
      data.difficulty === "expert"
        ? data.difficulty
        : "easy",
    status:
      data.status === "scheduled" || data.status === "completed" ? data.status : "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getCurrentDailyChallenge(key = dateKey()) {
  const snapshot = await getDoc(doc(ensureDb(), "dailyChallenges", key));
  return snapshot.exists() ? mapDailyChallenge(snapshot.id, snapshot.data()) : null;
}

export async function listDailyChallenges(count = 30) {
  const snapshot = await getDocs(query(collection(ensureDb(), "dailyChallenges"), limit(count)));
  return snapshot.docs
    .map((item) => mapDailyChallenge(item.id, item.data()))
    .sort((first, second) => second.dateKey.localeCompare(first.dateKey));
}

export async function setDailyChallenge(quiz: Quiz, key = dateKey()) {
  if (quiz.status !== "published" || quiz.visibility !== "public") {
    throw new Error("Only published public quizzes can become daily challenges.");
  }

  const batch = writeBatch(ensureDb());
  const activeFlags = await getDocs(
    query(collection(ensureDb(), "quizzes"), where("isDailyChallenge", "==", true), limit(20))
  );
  activeFlags.docs.forEach((snapshot) => {
    batch.update(snapshot.ref, {
      isDailyChallenge: false,
      updatedAt: serverTimestamp()
    });
  });
  batch.update(doc(ensureDb(), "quizzes", quiz.id), {
    isDailyChallenge: true,
    updatedAt: serverTimestamp()
  });
  batch.set(
    doc(ensureDb(), "dailyChallenges", key),
    {
      dateKey: key,
      quizId: quiz.id,
      quizTitle: quiz.title,
      categoryId: quiz.categoryId,
      difficulty: quiz.difficulty,
      status: key === dateKey() ? "active" : "scheduled",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  await batch.commit();
}

export async function setQuizFeatured(quiz: Quiz, featured: boolean) {
  if (featured && (quiz.status !== "published" || quiz.visibility !== "public")) {
    throw new Error("Only published public quizzes can be featured.");
  }
  await updateDoc(doc(ensureDb(), "quizzes", quiz.id), {
    isFeatured: featured,
    updatedAt: serverTimestamp()
  });
}

export async function setCategoryFeatured(category: Category, featured: boolean) {
  if (featured && category.status !== "active") {
    throw new Error("Only active categories can be featured.");
  }
  await updateDoc(doc(ensureDb(), "categories", category.id), {
    featured,
    updatedAt: serverTimestamp()
  });
}

export function mapFeaturedConfig(id: string, data: Record<string, unknown>): FeaturedConfig {
  return {
    id,
    public: asBoolean(data.public, true),
    featuredQuizIds: asStringArray(data.featuredQuizIds),
    featuredCategoryIds: asStringArray(data.featuredCategoryIds),
    heroQuizId: asString(data.heroQuizId),
    liveRoomCtaEnabled: asBoolean(data.liveRoomCtaEnabled, true),
    updatedAt: toIso(data.updatedAt)
  };
}

export async function getFeaturedConfig() {
  const snapshot = await getDoc(doc(ensureDb(), "siteSettings", "homepage"));
  if (!snapshot.exists()) {
    return mapFeaturedConfig("homepage", { public: true, liveRoomCtaEnabled: true });
  }
  return mapFeaturedConfig(snapshot.id, snapshot.data());
}

export async function saveFeaturedConfig(config: Omit<FeaturedConfig, "updatedAt">) {
  await setDoc(
    doc(ensureDb(), "siteSettings", config.id || "homepage"),
    {
      ...config,
      public: true,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function defaultSiteSettings(): SiteSettings {
  return {
    id: "app",
    public: true,
    supportEmail: "",
    appAnnouncement: "",
    maintenanceMode: false,
    allowPublicRooms: true,
    allowQuickMatch: true,
    allowChallengeLinks: true,
    leaderboardEnabled: true,
    dailyChallengeEnabled: true,
    defaultQuestionTimer: 30,
    defaultRoomMaxPlayers: 8,
    defaultBotFillDelay: 30,
    featuredQuizLimit: 6,
    updatedAt: null
  };
}

export function mapSiteSettings(id: string, data: Record<string, unknown>): SiteSettings {
  const defaults = defaultSiteSettings();
  return {
    id,
    public: asBoolean(data.public, true),
    supportEmail: asString(data.supportEmail),
    appAnnouncement: asString(data.appAnnouncement),
    maintenanceMode: asBoolean(data.maintenanceMode),
    allowPublicRooms: asBoolean(data.allowPublicRooms, defaults.allowPublicRooms),
    allowQuickMatch: asBoolean(data.allowQuickMatch, defaults.allowQuickMatch),
    allowChallengeLinks: asBoolean(data.allowChallengeLinks, defaults.allowChallengeLinks),
    leaderboardEnabled: asBoolean(data.leaderboardEnabled, defaults.leaderboardEnabled),
    dailyChallengeEnabled: asBoolean(data.dailyChallengeEnabled, defaults.dailyChallengeEnabled),
    defaultQuestionTimer: asNumber(data.defaultQuestionTimer, defaults.defaultQuestionTimer),
    defaultRoomMaxPlayers: asNumber(data.defaultRoomMaxPlayers, defaults.defaultRoomMaxPlayers),
    defaultBotFillDelay: asNumber(data.defaultBotFillDelay, defaults.defaultBotFillDelay),
    featuredQuizLimit: asNumber(data.featuredQuizLimit, defaults.featuredQuizLimit),
    updatedAt: toIso(data.updatedAt)
  };
}

export async function getSiteSettings(settingId = "app") {
  const snapshot = await getDoc(doc(ensureDb(), "siteSettings", settingId));
  return snapshot.exists() ? mapSiteSettings(snapshot.id, snapshot.data()) : defaultSiteSettings();
}

export async function saveSiteSettings(settings: SiteSettings) {
  await setDoc(
    doc(ensureDb(), "siteSettings", settings.id || "app"),
    {
      ...settings,
      public: true,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function importCategoryDraft(input: CategoryInput) {
  return createCategory({ ...input, status: "hidden" });
}

export async function importQuizDraft(input: QuizInput, questions: QuestionInput[] = []) {
  const quizId = await createQuiz({ ...input, status: "draft", isFeatured: false, isDailyChallenge: false });
  for (const [index, question] of questions.entries()) {
    await createQuestion({ ...question, quizId, status: "hidden", order: index + 1 });
  }
  return quizId;
}
