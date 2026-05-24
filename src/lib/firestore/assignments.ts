import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { getPlayableQuiz } from "@/lib/firestore/attempts";
import { getClassMember, listUserClasses } from "@/lib/firestore/classrooms";
import { mapAssignment, mapAssignmentSubmission } from "@/lib/firestore/mappers";
import type {
  Assignment,
  AssignmentStatus,
  AssignmentSubmission,
  ClassroomClass,
  UserProfile
} from "@/types/domain";

const assignmentListLimit = 100;

export interface AssignmentInput {
  quizId: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  status: AssignmentStatus;
  allowLateSubmission: boolean;
  attemptLimit: number;
  showResultsImmediately: boolean;
}

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function assignmentsCollection() {
  return collection(ensureDb(), "assignments");
}

function submissionId(assignmentId: string, userId: string) {
  return `${assignmentId}_${userId}`;
}

export async function createAssignment({
  user,
  profile,
  classroom,
  input
}: {
  user: User;
  profile: UserProfile | null;
  classroom: ClassroomClass;
  input: AssignmentInput;
}) {
  if (classroom.ownerId !== user.uid && !hasAdminAccess({ email: user.email, profile })) {
    throw new Error("Only the class owner can create assignments.");
  }
  if (!input.title.trim()) throw new Error("Assignment title is required.");
  const quiz = await getPlayableQuiz(input.quizId);
  if (!quiz) throw new Error("Choose a published playable quiz.");

  const clientDb = ensureDb();
  const assignmentRef = doc(assignmentsCollection());
  const batch = writeBatch(clientDb);
  batch.set(assignmentRef, {
    classId: classroom.id,
    className: classroom.name,
    quizId: quiz.id,
    quizSlug: quiz.slug,
    quizTitle: quiz.title,
    categoryId: quiz.categoryId,
    categoryName: quiz.categoryName,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    status: input.status,
    allowLateSubmission: input.allowLateSubmission,
    attemptLimit: Math.max(1, Math.min(5, input.attemptLimit || 1)),
    showResultsImmediately: input.showResultsImmediately,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: input.status === "published" ? serverTimestamp() : null
  });
  batch.update(doc(clientDb, "classes", classroom.id), {
    assignmentCount: increment(1),
    updatedAt: serverTimestamp()
  });
  batch.update(doc(clientDb, "users", user.uid), {
    lastCreatorActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await batch.commit();
  return assignmentRef.id;
}

export async function getAssignment(assignmentId: string): Promise<Assignment | null> {
  const snapshot = await getDoc(doc(ensureDb(), "assignments", assignmentId));
  return snapshot.exists() ? mapAssignment(snapshot) : null;
}

export async function listClassAssignments(classId: string, includeDrafts = false): Promise<Assignment[]> {
  const constraints = includeDrafts
    ? [where("classId", "==", classId), orderBy("createdAt", "desc"), limit(assignmentListLimit)]
    : [
        where("classId", "==", classId),
        where("status", "==", "published"),
        orderBy("dueAt", "asc"),
        limit(assignmentListLimit)
      ];
  const snapshot = await getDocs(query(assignmentsCollection(), ...constraints));
  return snapshot.docs.map(mapAssignment);
}

export async function listTeacherAssignments(ownerId: string): Promise<Assignment[]> {
  const classes = await listUserClasses(ownerId);
  const assignments = await Promise.all(classes.map((item) => listClassAssignments(item.id, true)));
  return assignments.flat().sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return secondTime - firstTime;
  });
}

export async function listStudentAssignments(userId: string): Promise<Assignment[]> {
  const classes = await listUserClasses(userId);
  const assignments = await Promise.all(classes.map((item) => listClassAssignments(item.id)));
  return assignments.flat();
}

export async function getAssignmentSubmission(
  assignmentId: string,
  userId: string
): Promise<AssignmentSubmission | null> {
  const snapshot = await getDoc(doc(ensureDb(), "assignmentSubmissions", submissionId(assignmentId, userId)));
  return snapshot.exists() ? mapAssignmentSubmission(snapshot) : null;
}

export async function listAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "assignmentSubmissions"),
      where("assignmentId", "==", assignmentId),
      orderBy("submittedAt", "desc"),
      limit(assignmentListLimit)
    )
  );
  return snapshot.docs.map(mapAssignmentSubmission);
}

export async function getAssignmentForStudent(assignmentId: string, userId: string) {
  const assignment = await getAssignment(assignmentId);
  if (!assignment || assignment.status === "draft") return null;
  const membership = await getClassMember(assignment.classId, userId);
  if (!membership || membership.status !== "active") return null;
  const submission = await getAssignmentSubmission(assignmentId, userId);
  return { assignment, membership, submission };
}

export function assignmentCanStart(assignment: Assignment, submission: AssignmentSubmission | null) {
  if (assignment.status === "closed") return { ok: false, reason: "This assignment is closed." };
  if (submission?.status === "submitted" || submission?.status === "late") {
    return { ok: false, reason: "This assignment has already been submitted." };
  }
  if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now() && !assignment.allowLateSubmission) {
    return { ok: false, reason: "The due date has passed." };
  }
  return { ok: true, reason: "" };
}

export async function closeAssignment(assignmentId: string) {
  await updateDoc(doc(ensureDb(), "assignments", assignmentId), {
    status: "closed",
    updatedAt: serverTimestamp()
  });
}
