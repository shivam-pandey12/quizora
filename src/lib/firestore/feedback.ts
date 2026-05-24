import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type QueryConstraint,
  updateDoc,
  where
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { toIso } from "@/lib/firestore/timestamps";
import type { AdminPriority, Feedback, FeedbackType } from "@/types/domain";

const adminFeedbackLimit = 80;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asPriority(value: unknown): AdminPriority {
  return value === "high" || value === "low" ? value : "medium";
}

function asFeedbackType(value: unknown): FeedbackType {
  if (
    value === "bug" ||
    value === "feature" ||
    value === "ui" ||
    value === "quiz-quality"
  ) {
    return value;
  }
  return "general";
}

export function mapFeedback(id: string, data: Record<string, unknown>): Feedback {
  const status =
    data.status === "reviewing" || data.status === "done" || data.status === "dismissed"
      ? data.status
      : "new";

  return {
    id,
    userId: asString(data.userId || data.uid) || null,
    name: asString(data.name),
    email: asString(data.email),
    type: asFeedbackType(data.type),
    message: asString(data.message),
    pageUrl: asString(data.pageUrl),
    status,
    priority: asPriority(data.priority),
    adminNote: asString(data.adminNote),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

export async function createFeedback(input: {
  userId: string;
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
  pageUrl: string;
  priority?: AdminPriority;
}) {
  const ref = await addDoc(collection(ensureDb(), "feedback"), {
    ...input,
    uid: input.userId,
    status: "new",
    priority: input.priority ?? "medium",
    adminNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function listAdminFeedback({
  status,
  type,
  count = adminFeedbackLimit
}: {
  status?: Feedback["status"] | "all";
  type?: FeedbackType | "all";
  count?: number;
} = {}) {
  const constraints: QueryConstraint[] = [];
  if (status && status !== "all") constraints.push(where("status", "==", status));
  if (type && type !== "all") constraints.push(where("type", "==", type));
  constraints.push(orderBy("createdAt", "desc"), limit(count));

  const snapshot = await getDocs(query(collection(ensureDb(), "feedback"), ...constraints));
  return snapshot.docs.map((docSnapshot) =>
    mapFeedback(docSnapshot.id, docSnapshot.data())
  );
}

export async function updateFeedbackWorkflow({
  feedback,
  status,
  priority,
  adminNote
}: {
  feedback: Feedback;
  status: Feedback["status"];
  priority: AdminPriority;
  adminNote: string;
}) {
  await updateDoc(doc(ensureDb(), "feedback", feedback.id), {
    status,
    priority,
    adminNote,
    updatedAt: serverTimestamp()
  });
}
