import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
  type Firestore
} from "firebase/firestore/lite";
import type { Category, Quiz, QuizDifficulty, QuizStatus, QuizVisibility } from "@/types/domain";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const isSeoFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

function toIso(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
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

function mapSeoCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: asString(data.name),
    slug: asString(data.slug, id),
    description: asString(data.description),
    icon: asString(data.icon, "Sparkles"),
    accent: asString(data.accent, "bg-primary/12 text-primary"),
    quizCount: asNumber(data.quizCount),
    featured: asBoolean(data.featured),
    status: data.status === "hidden" ? "hidden" : "active",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapSeoQuiz(id: string, data: Record<string, unknown>): Quiz {
  const difficulty = ["easy", "medium", "hard", "expert"].includes(asString(data.difficulty))
    ? (data.difficulty as QuizDifficulty)
    : "easy";
  const status = ["draft", "published", "archived"].includes(asString(data.status))
    ? (data.status as QuizStatus)
    : "draft";
  const visibility = data.visibility === "private" ? "private" : ("public" satisfies QuizVisibility);
  const ownerType = data.ownerType === "creator" ? "creator" : "admin";
  const reviewStatus =
    data.reviewStatus === "submitted" ||
    data.reviewStatus === "approved" ||
    data.reviewStatus === "rejected"
      ? data.reviewStatus
      : ownerType === "admin" && status === "published"
        ? "approved"
        : "draft";

  return {
    id,
    title: asString(data.title, "Untitled quiz"),
    slug: asString(data.slug, id),
    description: asString(data.description),
    shortDescription: asString(data.shortDescription),
    categoryId: asString(data.categoryId),
    categoryName: asString(data.categoryName, "Uncategorized"),
    difficulty,
    status,
    visibility,
    thumbnailUrl: asString(data.thumbnailUrl),
    coverImageUrl: asString(data.coverImageUrl),
    coverImagePath: asString(data.coverImagePath),
    coverImageAlt: asString(data.coverImageAlt),
    coverImageCaption: asString(data.coverImageCaption),
    tags: asStringArray(data.tags),
    estimatedMinutes: asNumber(data.estimatedMinutes, 8),
    questionCount: asNumber(data.questionCount),
    totalPoints: asNumber(data.totalPoints),
    timeLimitSeconds: asNumber(data.timeLimitSeconds),
    isFeatured: asBoolean(data.isFeatured),
    isDailyChallenge: asBoolean(data.isDailyChallenge),
    ownerId: asString(data.ownerId),
    ownerName: asString(data.ownerName),
    ownerEmail: asString(data.ownerEmail),
    ownerType,
    publishScope:
      data.publishScope === "class-only" || data.publishScope === "private"
        ? data.publishScope
        : "global",
    reviewStatus,
    updatedBy: asString(data.updatedBy),
    rejectionNote: asString(data.rejectionNote),
    submittedAt: toIso(data.submittedAt),
    reviewedAt: toIso(data.reviewedAt),
    reviewedBy: asString(data.reviewedBy),
    reviewedByName: asString(data.reviewedByName),
    approvedAt: toIso(data.approvedAt),
    approvedBy: asString(data.approvedBy),
    creatorEditable: asBoolean(data.creatorEditable, true),
    allowedClassIds: asStringArray(data.allowedClassIds),
    playCount: asNumber(data.playCount),
    averageScore: asNumber(data.averageScore),
    createdBy: asString(data.createdBy),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    publishedAt: toIso(data.publishedAt)
  };
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getSeoDb() {
  if (!isSeoFirebaseConfigured) return null;
  app = app ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));
  db = db ?? getFirestore(app);
  return db;
}

export async function listSeoPublicQuizzes() {
  const seoDb = getSeoDb();
  if (!seoDb) return [];
  const snapshot = await getDocs(
    query(
      collection(seoDb, "quizzes"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      orderBy("publishedAt", "desc"),
      limit(80)
    )
  );

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      slug: typeof data.slug === "string" ? data.slug : doc.id,
      updatedAt: toIso(data.updatedAt),
      publishedAt: toIso(data.publishedAt)
    };
  });
}

export async function listSeoPublicCategories() {
  const seoDb = getSeoDb();
  if (!seoDb) return [];
  const snapshot = await getDocs(
    query(
      collection(seoDb, "categories"),
      where("status", "==", "active"),
      orderBy("featured", "desc"),
      orderBy("name", "asc"),
      limit(80)
    )
  );

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      slug: typeof data.slug === "string" ? data.slug : doc.id,
      updatedAt: toIso(data.updatedAt)
    };
  });
}

export async function getSeoPublicQuizBySlug(slug: string) {
  const seoDb = getSeoDb();
  if (!seoDb) return null;
  const snapshot = await getDocs(
    query(
      collection(seoDb, "quizzes"),
      where("slug", "==", slug),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      limit(1)
    )
  );
  return snapshot.empty ? null : mapSeoQuiz(snapshot.docs[0].id, snapshot.docs[0].data());
}

export async function getSeoPublicCategoryBySlug(slug: string) {
  const seoDb = getSeoDb();
  if (!seoDb) return null;
  const snapshot = await getDocs(
    query(
      collection(seoDb, "categories"),
      where("slug", "==", slug),
      where("status", "==", "active"),
      limit(1)
    )
  );
  return snapshot.empty ? null : mapSeoCategory(snapshot.docs[0].id, snapshot.docs[0].data());
}

export async function getSeoPublicCategoryById(categoryId: string) {
  const seoDb = getSeoDb();
  if (!seoDb) return null;
  const snapshot = await getDoc(doc(seoDb, "categories", categoryId));
  if (!snapshot.exists()) return null;
  const category = mapSeoCategory(snapshot.id, snapshot.data());
  return category.status === "active" ? category : null;
}

export async function listSeoPublicQuizzesByCategory(categoryId: string) {
  const seoDb = getSeoDb();
  if (!seoDb) return [];
  const snapshot = await getDocs(
    query(
      collection(seoDb, "quizzes"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      where("publishScope", "==", "global"),
      where("reviewStatus", "==", "approved"),
      where("categoryId", "==", categoryId),
      orderBy("publishedAt", "desc"),
      limit(80)
    )
  );
  return snapshot.docs.map((doc) => mapSeoQuiz(doc.id, doc.data()));
}
