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
import type { AdminPriority, Report, ReportType } from "@/types/domain";

const adminReportLimit = 80;

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

function asReportType(value: unknown): ReportType {
  if (
    value === "question" ||
    value === "quiz" ||
    value === "user" ||
    value === "room" ||
    value === "attempt" ||
    value === "bug"
  ) {
    return value;
  }
  return "other";
}

export function mapReport(id: string, data: Record<string, unknown>): Report {
  const status =
    data.status === "reviewing" ||
    data.status === "resolved" ||
    data.status === "dismissed"
      ? data.status
      : "open";

  return {
    id,
    type: asReportType(data.type),
    targetId: asString(data.targetId),
    targetLabel: asString(data.targetLabel),
    targetUrl: asString(data.targetUrl),
    reportedBy: asString(data.reportedBy || data.uid),
    reportedByName: asString(data.reportedByName, "Quizora Player"),
    reason: asString(data.reason),
    details: asString(data.details || data.message),
    status,
    priority: asPriority(data.priority),
    adminNote: asString(data.adminNote),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    resolvedAt: toIso(data.resolvedAt),
    resolvedBy: asString(data.resolvedBy) || null
  };
}

export async function createReport(input: {
  type: ReportType;
  targetId: string;
  targetLabel: string;
  targetUrl: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  details: string;
  priority?: AdminPriority;
}) {
  const ref = await addDoc(collection(ensureDb(), "reports"), {
    ...input,
    uid: input.reportedBy,
    status: "open",
    priority: input.priority ?? "medium",
    adminNote: "",
    resolvedAt: null,
    resolvedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function listAdminReports({
  status,
  type,
  targetId,
  count = adminReportLimit
}: {
  status?: Report["status"] | "all";
  type?: ReportType | "all";
  targetId?: string;
  count?: number;
} = {}) {
  const constraints: QueryConstraint[] = [];
  if (status && status !== "all") constraints.push(where("status", "==", status));
  if (type && type !== "all") constraints.push(where("type", "==", type));
  if (targetId) constraints.push(where("targetId", "==", targetId));
  constraints.push(orderBy("createdAt", "desc"), limit(count));

  const snapshot = await getDocs(query(collection(ensureDb(), "reports"), ...constraints));
  return snapshot.docs.map((docSnapshot) =>
    mapReport(docSnapshot.id, docSnapshot.data())
  );
}

export async function updateReportWorkflow({
  report,
  status,
  priority,
  adminNote,
  adminId
}: {
  report: Report;
  status: Report["status"];
  priority: AdminPriority;
  adminNote: string;
  adminId: string;
}) {
  await updateDoc(doc(ensureDb(), "reports", report.id), {
    status,
    priority,
    adminNote,
    resolvedAt: status === "resolved" || status === "dismissed" ? serverTimestamp() : null,
    resolvedBy: status === "resolved" || status === "dismissed" ? adminId : null,
    updatedAt: serverTimestamp()
  });
}
