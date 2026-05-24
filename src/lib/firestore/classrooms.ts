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
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import {
  mapAssignmentSubmission,
  mapClassInvite,
  mapClassMember,
  mapClassroomClass
} from "@/lib/firestore/mappers";
import { createSlug } from "@/lib/firestore/slug";
import { createRoom } from "@/lib/firestore/rooms";
import type {
  AssignmentSubmission,
  ClassInvite,
  ClassMember,
  ClassroomClass,
  RoomInput,
  UserProfile
} from "@/types/domain";

const classListLimit = 60;
const memberListLimit = 120;

export interface ClassroomInput {
  name: string;
  description: string;
  subject: string;
  gradeLevel: string;
  coverAccent: string;
  organizationName: string;
}

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function classesCollection() {
  return collection(ensureDb(), "classes");
}

export function canTeach(profile: UserProfile | null) {
  return hasAdminAccess({ profile }) || profile?.creatorStatus === "approved";
}

function canTeachAsUser(user: User, profile: UserProfile | null) {
  return hasAdminAccess({ email: user.email, profile }) || profile?.creatorStatus === "approved";
}

export function classMemberId(classId: string, userId: string) {
  return `${classId}_${userId}`;
}

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function createUniqueInviteCode() {
  for (let index = 0; index < 12; index += 1) {
    const code = randomInviteCode();
    const snapshot = await getDoc(doc(ensureDb(), "classInvites", code));
    if (!snapshot.exists()) return code;
  }
  throw new Error("Could not create a unique invite code. Try again.");
}

function emptyClassStats() {
  return {
    completedAssignments: 0,
    averageAccuracy: 0,
    totalScore: 0,
    bestRank: 0,
    liveRoomsPlayed: 0
  };
}

export async function createClassroom({
  user,
  profile,
  input
}: {
  user: User;
  profile: UserProfile | null;
  input: ClassroomInput;
}) {
  if (!canTeachAsUser(user, profile)) throw new Error("Creator or teacher approval is required to create classes.");
  if (!input.name.trim()) throw new Error("Class name is required.");

  const clientDb = ensureDb();
  const classRef = doc(classesCollection());
  const inviteCode = await createUniqueInviteCode();
  const inviteRef = doc(clientDb, "classInvites", inviteCode);
  const memberRef = doc(clientDb, "classMembers", classMemberId(classRef.id, user.uid));
  const userRef = doc(clientDb, "users", user.uid);
  const ownerName = profile?.displayName || user.displayName || user.email || "Quizora Teacher";
  const organizationName = input.organizationName.trim() || profile?.teacherProfile.organizationName || "";

  const batch = writeBatch(clientDb);
  batch.set(classRef, {
    name: input.name.trim(),
    slug: createSlug(input.name),
    description: input.description.trim(),
    subject: input.subject.trim() || "General",
    gradeLevel: input.gradeLevel.trim(),
    coverAccent: input.coverAccent || "from-amber-200 via-stone-100 to-sky-100",
    ownerId: user.uid,
    ownerName,
    organizationName,
    status: "active",
    visibility: "invite-only",
    inviteCode,
    memberCount: 1,
    assignmentCount: 0,
    roomCount: 0,
    averageAccuracy: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archivedAt: null
  });
  batch.set(inviteRef, {
    classId: classRef.id,
    inviteCode,
    createdBy: user.uid,
    status: "active",
    expiresAt: null,
    maxUses: 0,
    usedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(memberRef, {
    classId: classRef.id,
    userId: user.uid,
    displayName: ownerName,
    email: user.email || profile?.email || "",
    photoURL: profile?.photoURL || user.photoURL || null,
    role: "teacher",
    status: "active",
    joinedAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    stats: emptyClassStats()
  });
  batch.update(userRef, {
    createdClassCount: increment(1),
    lastCreatorActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await batch.commit();
  return classRef.id;
}

export async function getClassroom(classId: string): Promise<ClassroomClass | null> {
  const snapshot = await getDoc(doc(ensureDb(), "classes", classId));
  return snapshot.exists() ? mapClassroomClass(snapshot) : null;
}

export async function getClassMember(classId: string, userId: string): Promise<ClassMember | null> {
  const snapshot = await getDoc(doc(ensureDb(), "classMembers", classMemberId(classId, userId)));
  return snapshot.exists() ? mapClassMember(snapshot) : null;
}

export async function listCreatorClasses(ownerId: string): Promise<ClassroomClass[]> {
  const snapshot = await getDocs(
    query(classesCollection(), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"), limit(classListLimit))
  );
  return snapshot.docs.map(mapClassroomClass);
}

export async function listUserClasses(userId: string): Promise<ClassroomClass[]> {
  const memberships = await getDocs(
    query(
      collection(ensureDb(), "classMembers"),
      where("userId", "==", userId),
      where("status", "==", "active"),
      orderBy("joinedAt", "desc"),
      limit(classListLimit)
    )
  );
  const classes = await Promise.all(
    memberships.docs.map((membership) => getClassroom(mapClassMember(membership).classId))
  );
  return classes.filter((item): item is ClassroomClass => Boolean(item));
}

export async function listClassMembers(classId: string): Promise<ClassMember[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "classMembers"),
      where("classId", "==", classId),
      where("status", "==", "active"),
      orderBy("joinedAt", "asc"),
      limit(memberListLimit)
    )
  );
  return snapshot.docs.map(mapClassMember);
}

export async function getInviteByCode(code: string): Promise<ClassInvite | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const snapshot = await getDoc(doc(ensureDb(), "classInvites", normalized));
  if (!snapshot.exists()) return null;
  const invite = mapClassInvite(snapshot);
  return invite.status === "active" ? invite : null;
}

export async function joinClassByCode({
  code,
  user,
  profile
}: {
  code: string;
  user: User;
  profile: UserProfile | null;
}) {
  const invite = await getInviteByCode(code);
  if (!invite) throw new Error("That class invite is not active.");
  const classroom = await getClassroom(invite.classId);
  if (!classroom || classroom.status !== "active") throw new Error("This class is not open for joining.");

  const clientDb = ensureDb();
  const memberRef = doc(clientDb, "classMembers", classMemberId(classroom.id, user.uid));
  const classRef = doc(clientDb, "classes", classroom.id);
  const inviteRef = doc(clientDb, "classInvites", invite.id);
  const userRef = doc(clientDb, "users", user.uid);
  const displayName = profile?.displayName || user.displayName || user.email || "Quizora Student";

  await runTransaction(clientDb, async (transaction) => {
    const [memberSnapshot, classSnapshot, inviteSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(classRef),
      transaction.get(inviteRef)
    ]);
    if (!classSnapshot.exists()) throw new Error("Class not found.");
    if (!inviteSnapshot.exists()) throw new Error("Invite not found.");
    const classData = classSnapshot.data();
    const inviteData = inviteSnapshot.data();
    if (classData.status !== "active") throw new Error("This class is archived.");
    if (inviteData.status !== "active") throw new Error("This invite is no longer active.");
    if (memberSnapshot.exists() && memberSnapshot.data().status === "active") return;

    transaction.set(
      memberRef,
      {
        classId: classroom.id,
        userId: user.uid,
        displayName,
        email: user.email || profile?.email || "",
        photoURL: profile?.photoURL || user.photoURL || null,
        inviteCode: invite.inviteCode,
        role: "student",
        status: "active",
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        stats: emptyClassStats()
      },
      { merge: true }
    );
    transaction.update(classRef, {
      memberCount: increment(memberSnapshot.exists() ? 0 : 1),
      updatedAt: serverTimestamp()
    });
    transaction.update(inviteRef, {
      usedCount: increment(memberSnapshot.exists() ? 0 : 1),
      updatedAt: serverTimestamp()
    });
    transaction.update(userRef, {
      joinedClassCount: increment(memberSnapshot.exists() ? 0 : 1),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  return classroom.id;
}

export async function regenerateClassInvite(classroom: ClassroomClass, userId: string) {
  if (classroom.ownerId !== userId) throw new Error("Only the class owner can regenerate the invite.");
  const inviteCode = await createUniqueInviteCode();
  const clientDb = ensureDb();
  const batch = writeBatch(clientDb);
  batch.update(doc(clientDb, "classes", classroom.id), {
    inviteCode,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(clientDb, "classInvites", inviteCode), {
    classId: classroom.id,
    inviteCode,
    createdBy: userId,
    status: "active",
    expiresAt: null,
    maxUses: 0,
    usedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  if (classroom.inviteCode) {
    batch.update(doc(clientDb, "classInvites", classroom.inviteCode), {
      status: "disabled",
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
  return inviteCode;
}

export async function archiveClassroom(classId: string) {
  await updateDoc(doc(ensureDb(), "classes", classId), {
    status: "archived",
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function listAdminClasses(count = 100): Promise<ClassroomClass[]> {
  const snapshot = await getDocs(
    query(classesCollection(), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapClassroomClass);
}

export async function createClassLiveRoom({
  user,
  profile,
  classroom,
  input
}: {
  user: User;
  profile: UserProfile | null;
  classroom: ClassroomClass;
  input: Omit<RoomInput, "source" | "visibility" | "classId" | "className" | "allowedMemberOnly">;
}) {
  if (classroom.ownerId !== user.uid && !hasAdminAccess({ email: user.email, profile })) {
    throw new Error("Only the class owner can create class rooms.");
  }
  const roomCode = await createRoom({
    user,
    profile,
    input: {
      ...input,
      source: "class-room",
      visibility: "private",
      classId: classroom.id,
      className: classroom.name,
      allowedMemberOnly: true
    }
  });
  await updateDoc(doc(ensureDb(), "classes", classroom.id), {
    roomCount: increment(1),
    updatedAt: serverTimestamp()
  });
  return roomCode;
}

export async function listClassSubmissions(classId: string): Promise<AssignmentSubmission[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "assignmentSubmissions"),
      where("classId", "==", classId),
      orderBy("submittedAt", "desc"),
      limit(200)
    )
  );
  return snapshot.docs.map(mapAssignmentSubmission);
}

export function classResultsToCsv(submissions: AssignmentSubmission[]) {
  const header = [
    "student",
    "assignmentId",
    "score",
    "totalPoints",
    "accuracy",
    "status",
    "submittedAt",
    "timeTakenSeconds"
  ];
  const rows = submissions.map((submission) =>
    [
      submission.userDisplayName,
      submission.assignmentId,
      submission.score,
      submission.totalPoints,
      submission.accuracy,
      submission.status,
      submission.submittedAt ?? "",
      submission.timeTakenSeconds
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
