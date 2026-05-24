import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { listClassAssignments } from "@/lib/firestore/assignments";
import { listClassMembers, listClassSubmissions } from "@/lib/firestore/classrooms";
import { mapClassLeaderboardRow } from "@/lib/firestore/mappers";
import type { ClassAnalyticsSnapshot, ClassLeaderboardRow } from "@/types/domain";

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function listClassLeaderboardRows(classId: string): Promise<ClassLeaderboardRow[]> {
  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "classLeaderboardRows"),
      where("classId", "==", classId),
      orderBy("totalScore", "desc"),
      limit(100)
    )
  );
  return snapshot.docs.map((docSnapshot, index) => {
    const data = docSnapshot.data();
    return {
      userId: asString(data.userId),
      displayName: asString(data.displayName, "Quizora Student"),
      photoURL: asString(data.photoURL) || null,
      rank: index + 1,
      completedAssignments: asNumber(data.completedAssignments),
      totalScore: asNumber(data.totalScore),
      averageAccuracy: asNumber(data.averageAccuracy)
    };
  });
}

export async function getClassAnalytics(classId: string): Promise<ClassAnalyticsSnapshot> {
  let members;
  let assignments;
  let submissions;
  try {
    [members, assignments, submissions] = await Promise.all([
      listClassMembers(classId),
      listClassAssignments(classId, true),
      listClassSubmissions(classId)
    ]);
  } catch {
    const leaderboard = await listClassLeaderboardRows(classId);
    const averageAccuracy = leaderboard.length
      ? Math.round(leaderboard.reduce((sum, row) => sum + row.averageAccuracy, 0) / leaderboard.length)
      : 0;
    return {
      classId,
      totalStudents: leaderboard.length,
      activeStudents: leaderboard.length,
      activeAssignments: 0,
      completionRate: 0,
      averageAccuracy,
      recentSubmissions: [],
      leaderboard
    };
  }
  const students = members.filter((member) => member.role === "student" && member.status === "active");
  const submitted = submissions.filter(
    (submission) => submission.status === "submitted" || submission.status === "late"
  );
  const expected = Math.max(1, students.length * assignments.filter((item) => item.status !== "draft").length);
  const averageAccuracy = submitted.length
    ? Math.round(submitted.reduce((sum, item) => sum + item.accuracy, 0) / submitted.length)
    : 0;
  const leaderboard = students
    .map((member) => {
      const memberSubmissions = submitted.filter((submission) => submission.userId === member.userId);
      const completedAssignments = memberSubmissions.length;
      const totalScore = memberSubmissions.reduce((sum, item) => sum + item.score, 0);
      const averageAccuracy = completedAssignments
        ? Math.round(memberSubmissions.reduce((sum, item) => sum + item.accuracy, 0) / completedAssignments)
        : 0;
      return {
        ...member,
        stats: {
          ...member.stats,
          completedAssignments,
          totalScore,
          averageAccuracy
        }
      };
    })
    .sort((first, second) => {
      if (first.stats.totalScore !== second.stats.totalScore) {
        return second.stats.totalScore - first.stats.totalScore;
      }
      return second.stats.averageAccuracy - first.stats.averageAccuracy;
    })
    .map((member, index) => mapClassLeaderboardRow(member, index + 1));

  return {
    classId,
    totalStudents: students.length,
    activeStudents: students.length,
    activeAssignments: assignments.filter((item) => item.status === "published").length,
    completionRate: Math.round((submitted.length / expected) * 100),
    averageAccuracy,
    recentSubmissions: submissions.slice(0, 12),
    leaderboard
  };
}
