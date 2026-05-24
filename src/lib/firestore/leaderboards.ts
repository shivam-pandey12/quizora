import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db, firebaseSetupMessage } from "@/lib/firebase/client";
import { mapAttempt, mapLeaderboardEntry } from "@/lib/firestore/mappers";
import { getPeriodKey } from "@/lib/quiz/periods";
import type {
  Attempt,
  LeaderboardEntry,
  LeaderboardQuery,
  LeaderboardResult,
  LeaderboardScope,
  PeriodType,
  UserProfile
} from "@/types/domain";

const periodTypes: PeriodType[] = ["all-time", "daily", "weekly", "monthly"];

function ensureDb() {
  if (!db) throw new Error(firebaseSetupMessage);
  return db;
}

function safeId(value: string) {
  return encodeURIComponent(value || "all").replace(/\./g, "%2E");
}

export function leaderboardEntryId({
  scope,
  scopeId,
  periodType,
  periodKey,
  userId
}: {
  scope: LeaderboardScope;
  scopeId: string;
  periodType: PeriodType;
  periodKey: string;
  userId: string;
}) {
  return [scope, safeId(scopeId), periodType, safeId(periodKey), safeId(userId)].join("_");
}

export function calculateRankScore({
  score,
  accuracy,
  timeTakenSeconds
}: {
  score: number;
  accuracy: number;
  timeTakenSeconds: number;
}) {
  return Math.max(
    0,
    Math.round(score * 1_000_000 + accuracy * 1_000 - Math.min(timeTakenSeconds, 99_999))
  );
}

function isBetterAttempt(incoming: Attempt, existing?: LeaderboardEntry | null) {
  if (!existing) return true;
  if (incoming.score !== existing.score) return incoming.score > existing.score;
  if (incoming.accuracy !== existing.accuracy) return incoming.accuracy > existing.accuracy;
  if (incoming.timeTakenSeconds !== existing.timeTakenSeconds) {
    return incoming.timeTakenSeconds < existing.timeTakenSeconds;
  }
  if (!incoming.completedAt || !existing.completedAt) return false;
  return new Date(incoming.completedAt).getTime() < new Date(existing.completedAt).getTime();
}

function baseEntryPayload({
  attempt,
  profile,
  scope,
  scopeId,
  periodType,
  periodKey,
  rankScore,
  aggregateAttempts = 1,
  hidden = false
}: {
  attempt: Attempt;
  profile?: UserProfile | null;
  scope: LeaderboardScope;
  scopeId: string;
  periodType: PeriodType;
  periodKey: string;
  rankScore: number;
  aggregateAttempts?: number;
  hidden?: boolean;
}) {
  return {
    scope,
    scopeId,
    userId: attempt.userId,
    userDisplayName: attempt.userDisplayName,
    userPhotoURL: profile?.photoURL ?? null,
    quizId: attempt.quizId,
    quizSlug: attempt.quizSlug,
    quizTitle: attempt.quizTitle,
    categoryId: attempt.categoryId,
    categoryName: attempt.categoryName,
    difficulty: attempt.difficulty,
    score: attempt.score,
    totalPoints: attempt.totalPoints,
    accuracy: attempt.accuracy,
    timeTakenSeconds: attempt.timeTakenSeconds,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    skippedCount: attempt.skippedCount,
    attemptId: attempt.id,
    periodType,
    periodKey,
    rankScore,
    aggregateAttempts,
    hidden,
    trusted: attempt.trusted === true,
    sourceAttemptId: attempt.id,
    scoringSource: attempt.scoringSource ?? "client",
    updatedBy: attempt.scoringSource === "server" ? "server" : "client",
    botEntry: attempt.userId.startsWith("bot_"),
    reviewStatus: attempt.reviewStatus ?? "none",
    completedAt: attempt.completedAt ? new Date(attempt.completedAt) : new Date(),
    updatedAt: serverTimestamp()
  };
}

async function getEntry(id: string) {
  const snapshot = await getDoc(doc(ensureDb(), "leaderboards", id));
  return snapshot.exists() ? mapLeaderboardEntry(snapshot) : null;
}

async function upsertQuizEntry({
  attempt,
  profile,
  periodType,
  periodKey
}: {
  attempt: Attempt;
  profile?: UserProfile | null;
  periodType: PeriodType;
  periodKey: string;
}) {
  const id = leaderboardEntryId({
    scope: "quiz",
    scopeId: attempt.quizId,
    periodType,
    periodKey,
    userId: attempt.userId
  });
  const ref = doc(ensureDb(), "leaderboards", id);
  const existing = await getEntry(id);

  if (!isBetterAttempt(attempt, existing)) {
    return { changed: false, existing };
  }

  const rankScore = calculateRankScore(attempt);
  await setDoc(
    ref,
    {
      ...baseEntryPayload({
        attempt,
        profile,
        scope: "quiz",
        scopeId: attempt.quizId,
        periodType,
        periodKey,
        rankScore,
        hidden: existing?.hidden ?? false
      }),
      createdAt: existing ? existing.createdAt ? new Date(existing.createdAt) : serverTimestamp() : serverTimestamp()
    },
    { merge: true }
  );

  return {
    changed: true,
    existing,
    deltaRankScore: rankScore - (existing?.rankScore ?? 0),
    deltaScore: attempt.score - (existing?.score ?? 0),
    deltaTotalPoints: attempt.totalPoints - (existing?.totalPoints ?? 0),
    deltaTime: attempt.timeTakenSeconds - (existing?.timeTakenSeconds ?? 0),
    deltaCorrect: attempt.correctCount - (existing?.correctCount ?? 0),
    deltaWrong: attempt.wrongCount - (existing?.wrongCount ?? 0),
    deltaSkipped: attempt.skippedCount - (existing?.skippedCount ?? 0),
    deltaAttempts: existing ? 0 : 1
  };
}

async function updateAggregateEntry({
  attempt,
  profile,
  scope,
  scopeId,
  periodType,
  periodKey,
  deltaRankScore,
  deltaScore,
  deltaTotalPoints,
  deltaTime,
  deltaCorrect,
  deltaWrong,
  deltaSkipped,
  deltaAttempts
}: {
  attempt: Attempt;
  profile?: UserProfile | null;
  scope: "global" | "category";
  scopeId: string;
  periodType: PeriodType;
  periodKey: string;
  deltaRankScore: number;
  deltaScore: number;
  deltaTotalPoints: number;
  deltaTime: number;
  deltaCorrect: number;
  deltaWrong: number;
  deltaSkipped: number;
  deltaAttempts: number;
}) {
  const id = leaderboardEntryId({ scope, scopeId, periodType, periodKey, userId: attempt.userId });
  const ref = doc(ensureDb(), "leaderboards", id);
  const existing = await getEntry(id);
  const aggregateAttempts = Math.max(1, (existing?.aggregateAttempts ?? 0) + deltaAttempts);
  const score = Math.max(0, (existing?.score ?? 0) + deltaScore);
  const totalPoints = Math.max(0, (existing?.totalPoints ?? 0) + deltaTotalPoints);
  const correctCount = Math.max(0, (existing?.correctCount ?? 0) + deltaCorrect);
  const wrongCount = Math.max(0, (existing?.wrongCount ?? 0) + deltaWrong);
  const skippedCount = Math.max(0, (existing?.skippedCount ?? 0) + deltaSkipped);
  const timeTakenSeconds = Math.max(0, (existing?.timeTakenSeconds ?? 0) + deltaTime);
  const accuracy = totalPoints ? Math.round((score / totalPoints) * 100) : attempt.accuracy;
  const rankScore = Math.max(0, (existing?.rankScore ?? 0) + deltaRankScore);

  await setDoc(
    ref,
    {
      ...baseEntryPayload({
        attempt,
        profile,
        scope,
        scopeId,
        periodType,
        periodKey,
        rankScore,
        aggregateAttempts,
        hidden: existing?.hidden ?? false
      }),
      score,
      totalPoints,
      accuracy,
      timeTakenSeconds,
      correctCount,
      wrongCount,
      skippedCount,
      createdAt: existing ? existing.createdAt ? new Date(existing.createdAt) : serverTimestamp() : serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateLeaderboardsForAttempt(
  attempt: Attempt,
  profile?: UserProfile | null
) {
  if (!attempt.trusted || attempt.hiddenFromLeaderboard || attempt.userId.startsWith("bot_")) return;
  for (const periodType of periodTypes) {
    const periodKey = getPeriodKey(
      periodType,
      attempt.completedAt ? new Date(attempt.completedAt) : new Date()
    );
    const quizUpdate = await upsertQuizEntry({ attempt, profile, periodType, periodKey });

    if (quizUpdate.changed) {
      await Promise.all([
        updateAggregateEntry({
          attempt,
          profile,
          scope: "global",
          scopeId: "all",
          periodType,
          periodKey,
          deltaRankScore: quizUpdate.deltaRankScore ?? 0,
          deltaScore: quizUpdate.deltaScore ?? 0,
          deltaTotalPoints: quizUpdate.deltaTotalPoints ?? 0,
          deltaTime: quizUpdate.deltaTime ?? 0,
          deltaCorrect: quizUpdate.deltaCorrect ?? 0,
          deltaWrong: quizUpdate.deltaWrong ?? 0,
          deltaSkipped: quizUpdate.deltaSkipped ?? 0,
          deltaAttempts: quizUpdate.deltaAttempts ?? 0
        }),
        updateAggregateEntry({
          attempt,
          profile,
          scope: "category",
          scopeId: attempt.categoryId,
          periodType,
          periodKey,
          deltaRankScore: quizUpdate.deltaRankScore ?? 0,
          deltaScore: quizUpdate.deltaScore ?? 0,
          deltaTotalPoints: quizUpdate.deltaTotalPoints ?? 0,
          deltaTime: quizUpdate.deltaTime ?? 0,
          deltaCorrect: quizUpdate.deltaCorrect ?? 0,
          deltaWrong: quizUpdate.deltaWrong ?? 0,
          deltaSkipped: quizUpdate.deltaSkipped ?? 0,
          deltaAttempts: quizUpdate.deltaAttempts ?? 0
        })
      ]);
    }
  }
}

export async function getLeaderboard({
  scope,
  scopeId,
  periodType,
  periodKey,
  limit: count = 25
}: LeaderboardQuery): Promise<LeaderboardResult> {
  const resolvedScopeId = scope === "global" ? "all" : scopeId || "";
  const resolvedPeriodKey = periodKey ?? getPeriodKey(periodType);
  if (!resolvedScopeId) return { entries: [], periodKey: resolvedPeriodKey };

  const snapshot = await getDocs(
    query(
      collection(ensureDb(), "leaderboards"),
      where("scope", "==", scope),
      where("scopeId", "==", resolvedScopeId),
      where("periodType", "==", periodType),
      where("periodKey", "==", resolvedPeriodKey),
      where("trusted", "==", true),
      where("hidden", "==", false),
      where("botEntry", "==", false),
      orderBy("rankScore", "desc"),
      orderBy("completedAt", "asc"),
      limit(count)
    )
  );

  return {
    periodKey: resolvedPeriodKey,
    entries: snapshot.docs.map(mapLeaderboardEntry).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
  };
}

export async function getCurrentUserRank(queryInput: LeaderboardQuery, userId: string) {
  const result = await getLeaderboard({ ...queryInput, limit: Math.max(queryInput.limit ?? 50, 50) });
  const ranked = result.entries.find((entry) => entry.userId === userId);
  if (ranked) return ranked;

  const resolvedScopeId = queryInput.scope === "global" ? "all" : queryInput.scopeId || "";
  if (!resolvedScopeId) return null;

  const id = leaderboardEntryId({
    scope: queryInput.scope,
    scopeId: resolvedScopeId,
    periodType: queryInput.periodType,
    periodKey: queryInput.periodKey ?? result.periodKey,
    userId
  });
  const entry = await getEntry(id);
  return entry?.trusted && !entry.hidden && !entry.botEntry ? entry : null;
}

export async function getQuizLeaderboardPreview(quizId: string) {
  return getLeaderboard({
    scope: "quiz",
    scopeId: quizId,
    periodType: "all-time",
    limit: 3
  });
}

export async function getUserQuizBest(quizId: string, userId: string) {
  const id = leaderboardEntryId({
    scope: "quiz",
    scopeId: quizId,
    periodType: "all-time",
    periodKey: "all",
    userId
  });
  return getEntry(id);
}

export async function hideLeaderboardEntry(entryId: string) {
  await updateDoc(doc(ensureDb(), "leaderboards", entryId), {
    hidden: true,
    reviewed: true,
    hiddenReason: "Hidden by admin review",
    updatedAt: serverTimestamp()
  });
}

export async function listAdminLeaderboardEntries(count = 100) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "leaderboards"), orderBy("createdAt", "desc"), limit(count))
  );
  return snapshot.docs.map(mapLeaderboardEntry);
}

export async function moderateLeaderboardEntry({
  entryId,
  hidden,
  suspicious,
  reviewed,
  hiddenReason,
  moderatedBy
}: {
  entryId: string;
  hidden: boolean;
  suspicious: boolean;
  reviewed: boolean;
  hiddenReason: string;
  moderatedBy: string;
}) {
  await updateDoc(doc(ensureDb(), "leaderboards", entryId), {
    hidden,
    suspicious,
    reviewed,
    hiddenReason,
    moderatedBy,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function rebuildLeaderboardsFromRecentAttempts(count = 200) {
  const snapshot = await getDocs(
    query(collection(ensureDb(), "attempts"), orderBy("completedAt", "desc"), limit(count))
  );
  const attempts = snapshot.docs.map(mapAttempt).filter((attempt) => attempt.status === "completed");

  for (const attempt of attempts.reverse()) {
    await updateLeaderboardsForAttempt(attempt);
  }

  return attempts.length;
}
