import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { isBootstrapAdminEmail } from "@/lib/auth/admin-access";
import { toIso } from "@/lib/firestore/timestamps";
import { normalizeBadges } from "@/lib/quiz/gamification";
import type { UserProfile, UserRole } from "@/types/domain";

const lastActiveRefreshMs = 10 * 60 * 1000;
function normalizeProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const teacherProfile =
    data.teacherProfile && typeof data.teacherProfile === "object"
      ? (data.teacherProfile as Record<string, unknown>)
      : {};
  return {
    uid,
    displayName: typeof data.displayName === "string" ? data.displayName : "Quizora Player",
    email: typeof data.email === "string" ? data.email : "",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    role: data.role === "admin" ? "admin" : ("user" satisfies UserRole),
    xp: typeof data.xp === "number" ? data.xp : 0,
    level: typeof data.level === "number" ? data.level : 1,
    totalQuizzesPlayed:
      typeof data.totalQuizzesPlayed === "number" ? data.totalQuizzesPlayed : 0,
    averageAccuracy: typeof data.averageAccuracy === "number" ? data.averageAccuracy : 0,
    currentStreak: typeof data.currentStreak === "number" ? data.currentStreak : 0,
    longestStreak: typeof data.longestStreak === "number" ? data.longestStreak : 0,
    lastPlayedDate: typeof data.lastPlayedDate === "string" ? data.lastPlayedDate : null,
    streakUpdatedAt: toIso(data.streakUpdatedAt),
    earnedBadges: normalizeBadges(data.earnedBadges),
    lastBadgeUnlocks: normalizeBadges(data.lastBadgeUnlocks),
    categoryIdsPlayed: Array.isArray(data.categoryIdsPlayed)
      ? data.categoryIdsPlayed.filter((item): item is string => typeof item === "string")
      : [],
    creatorStatus:
      data.creatorStatus === "pending" ||
      data.creatorStatus === "approved" ||
      data.creatorStatus === "suspended"
        ? data.creatorStatus
        : "none",
    teacherProfile: {
      displayTitle:
        typeof teacherProfile.displayTitle === "string" ? teacherProfile.displayTitle : "",
      organizationName:
        typeof teacherProfile.organizationName === "string"
          ? teacherProfile.organizationName
          : "",
      bio: typeof teacherProfile.bio === "string" ? teacherProfile.bio : "",
      subjectFocus:
        typeof teacherProfile.subjectFocus === "string" ? teacherProfile.subjectFocus : "",
      verified: teacherProfile.verified === true,
      createdAt: toIso(teacherProfile.createdAt),
      updatedAt: toIso(teacherProfile.updatedAt)
    },
    createdClassCount:
      typeof data.createdClassCount === "number" ? data.createdClassCount : 0,
    joinedClassCount:
      typeof data.joinedClassCount === "number" ? data.joinedClassCount : 0,
    creatorQuizCount:
      typeof data.creatorQuizCount === "number" ? data.creatorQuizCount : 0,
    assignmentsCompleted:
      typeof data.assignmentsCompleted === "number" ? data.assignmentsCompleted : 0,
    assignmentAverageAccuracy:
      typeof data.assignmentAverageAccuracy === "number" ? data.assignmentAverageAccuracy : 0,
    bestClassRank: typeof data.bestClassRank === "number" ? data.bestClassRank : 0,
    lastCreatorActivityAt: toIso(data.lastCreatorActivityAt),
    quickMatchesPlayed: typeof data.quickMatchesPlayed === "number" ? data.quickMatchesPlayed : 0,
    quickMatchesWon: typeof data.quickMatchesWon === "number" ? data.quickMatchesWon : 0,
    quickMatchBestRank: typeof data.quickMatchBestRank === "number" ? data.quickMatchBestRank : 0,
    quickMatchAverageAccuracy:
      typeof data.quickMatchAverageAccuracy === "number" ? data.quickMatchAverageAccuracy : 0,
    botMatchesPlayed: typeof data.botMatchesPlayed === "number" ? data.botMatchesPlayed : 0,
    challengeMatchesPlayed:
      typeof data.challengeMatchesPlayed === "number" ? data.challengeMatchesPlayed : 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    lastActiveAt: toIso(data.lastActiveAt)
  };
}

function shouldRefreshLastActive(lastActiveAt: string | null) {
  if (!lastActiveAt) return true;
  const previous = new Date(lastActiveAt).getTime();
  if (Number.isNaN(previous)) return true;
  return Date.now() - previous > lastActiveRefreshMs;
}

export async function createOrGetUserProfile(user: User): Promise<UserProfile> {
  if (!db) throw new Error(firebaseSetupMessage);

  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);
  const identityFields = {
    uid: user.uid,
    displayName: user.displayName || "Quizora Player",
    email: user.email || "",
    photoURL: user.photoURL || null
  };
  const bootstrapRole: UserRole = isBootstrapAdminEmail(user.email) ? "admin" : "user";

  if (!snapshot.exists()) {
    const profileSeed = {
      ...identityFields,
      role: bootstrapRole,
      xp: 0,
      level: 1,
      totalQuizzesPlayed: 0,
      averageAccuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      streakUpdatedAt: null,
      earnedBadges: [],
      lastBadgeUnlocks: [],
      categoryIdsPlayed: [],
      creatorStatus: "none" as const,
      teacherProfile: {
        displayTitle: "",
        organizationName: "",
        bio: "",
        subjectFocus: "",
        verified: false,
        createdAt: null,
        updatedAt: null
      },
      createdClassCount: 0,
      joinedClassCount: 0,
      creatorQuizCount: 0,
      assignmentsCompleted: 0,
      assignmentAverageAccuracy: 0,
      bestClassRank: 0,
      lastCreatorActivityAt: null,
      quickMatchesPlayed: 0,
      quickMatchesWon: 0,
      quickMatchBestRank: 0,
      quickMatchAverageAccuracy: 0,
      botMatchesPlayed: 0,
      challengeMatchesPlayed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    };

    await setDoc(profileRef, profileSeed);

    return {
      ...profileSeed,
      createdAt: null,
      updatedAt: null,
      lastActiveAt: null
    };
  }

  const existing = normalizeProfile(user.uid, snapshot.data());
  const updatePayload: Record<string, unknown> = {};

  if (existing.displayName !== identityFields.displayName) {
    updatePayload.displayName = identityFields.displayName;
  }
  if (existing.email !== identityFields.email) {
    updatePayload.email = identityFields.email;
  }
  if (existing.photoURL !== identityFields.photoURL) {
    updatePayload.photoURL = identityFields.photoURL;
  }
  if (bootstrapRole === "admin" && existing.role !== "admin") {
    updatePayload.role = "admin";
  }
  if (shouldRefreshLastActive(existing.lastActiveAt)) {
    updatePayload.lastActiveAt = serverTimestamp();
  }

  if (Object.keys(updatePayload).length) {
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(profileRef, updatePayload);
    const refreshed = await getDoc(profileRef);
    return normalizeProfile(user.uid, refreshed.data() ?? snapshot.data());
  }

  return existing;
}
