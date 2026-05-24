import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { toIso } from "@/lib/firestore/timestamps";
import type { AdminLog } from "@/types/domain";

const adminLogLimit = 80;

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function mapAdminLog(id: string, data: Record<string, unknown>): AdminLog {
  return {
    id,
    adminId: asString(data.adminId),
    adminName: asString(data.adminName, "Admin"),
    action: asString(data.action),
    targetType: asString(data.targetType),
    targetId: asString(data.targetId),
    targetLabel: asString(data.targetLabel),
    details: asString(data.details),
    createdAt: toIso(data.createdAt)
  };
}

export async function writeAdminLog(input: Omit<AdminLog, "id" | "createdAt">) {
  await addDoc(collection(ensureDb(), "adminLogs"), {
    ...input,
    createdAt: serverTimestamp()
  });
}

export async function writeAdminLogBestEffort(input: Omit<AdminLog, "id" | "createdAt">) {
  try {
    await writeAdminLog(input);
  } catch {
    // Logging must never block the primary admin action in this client-only phase.
  }
}

export async function listAdminLogs({
  adminId,
  targetType,
  count = adminLogLimit
}: {
  adminId?: string;
  targetType?: string;
  count?: number;
} = {}) {
  const constraints: QueryConstraint[] = [];
  if (adminId) constraints.push(where("adminId", "==", adminId));
  if (targetType) constraints.push(where("targetType", "==", targetType));
  constraints.push(orderBy("createdAt", "desc"), limit(count));

  const snapshot = await getDocs(query(collection(ensureDb(), "adminLogs"), ...constraints));
  return snapshot.docs.map((docSnapshot) =>
    mapAdminLog(docSnapshot.id, docSnapshot.data())
  );
}
