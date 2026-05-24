"use client";

import { Activity, Award, Bot, Crown, Flame, GraduationCap, Mail, Pencil, RadioTower, Shield, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { RecentAttemptList } from "@/components/attempts/recent-attempt-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { listRecentUserAttempts } from "@/lib/firestore/attempts";
import { getCurrentUserRank } from "@/lib/firestore/leaderboards";
import { listUserRoomHistory } from "@/lib/firestore/rooms";
import { getLevelProgress } from "@/lib/quiz/xp";
import type { Attempt, LeaderboardEntry, RoomResult } from "@/types/domain";

export function ProfileContent() {
  const { profile, user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [globalRank, setGlobalRank] = useState<LeaderboardEntry | null>(null);
  const [roomResults, setRoomResults] = useState<RoomResult[]>([]);
  const displayName = profile?.displayName || user?.displayName || "Quizora Player";
  const email = profile?.email || user?.email || "No email loaded";
  const role = profile?.role || "user";
  const profileImage = profile?.photoURL || user?.photoURL;
  const adminOverride = hasAdminAccess({ email: user?.email, profile });

  useEffect(() => {
    if (!user) {
      setAttemptsLoading(false);
      return;
    }

    const currentUser = user;
    let mounted = true;
    setAttemptsLoading(true);
    setAttemptsError(null);

    async function loadAttempts() {
      try {
        const nextAttempts = await listRecentUserAttempts(currentUser.uid, 4);
        if (mounted) setAttempts(nextAttempts);
      } catch (caught) {
        if (mounted) {
          setAttemptsError(
            caught instanceof Error ? caught.message : "Could not load profile activity."
          );
        }
      } finally {
        if (mounted) setAttemptsLoading(false);
      }
    }

    void loadAttempts();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;
    let mounted = true;
    async function loadRoomHistory() {
      try {
        const history = await listUserRoomHistory(currentUser.uid, 6);
        if (mounted) setRoomResults(history.results);
      } catch {
        if (mounted) setRoomResults([]);
      }
    }

    void loadRoomHistory();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;
    let mounted = true;
    async function loadRank() {
      try {
        const nextRank = await getCurrentUserRank(
          { scope: "global", periodType: "all-time", limit: 50 },
          currentUser.uid
        );
        if (mounted) setGlobalRank(nextRank);
      } catch {
        if (mounted) setGlobalRank(null);
      }
    }

    void loadRank();

    return () => {
      mounted = false;
    };
  }, [user]);

  const levelProgress = getLevelProgress(profile?.xp ?? 0);
  const bestAttempt = attempts.reduce<Attempt | null>((best, attempt) => {
    if (!best) return attempt;
    return attempt.score > best.score ? attempt : best;
  }, null);
  const bestRoomRank = roomResults.reduce<number | null>((best, result) => {
    if (best === null) return result.rank;
    return Math.min(best, result.rank);
  }, null);

  return (
    <div className="space-y-8">
      <Card className="grid gap-6 p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <UserAvatar name={displayName} size="lg" src={profileImage} />
        <div>
          <Badge className="mb-3">
            <Shield className="mr-2 size-3.5" />
            {role}
          </Badge>
          <h1 className="text-4xl font-semibold">{displayName}</h1>
          <p className="mt-3 flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4" />
            {email}
          </p>
        </div>
        <Button disabled icon={<Pencil className="size-4" />} variant="secondary">
          Edit profile soon
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="Stored on profile document"
          icon={<Crown className="size-5" />}
          label="Level"
          value={String(profile?.level ?? 1)}
        />
        <StatCard
          helper="Grows after attempts"
          icon={<Activity className="size-5" />}
          label="XP"
          value={String(profile?.xp ?? 0)}
        />
        <StatCard
          helper="Completed saved attempts"
          label="Quizzes played"
          value={String(profile?.totalQuizzesPlayed ?? 0)}
        />
        <StatCard
          helper="Updated by completed attempts"
          label="Average accuracy"
          value={`${profile?.averageAccuracy ?? 0}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Level progress</p>
              <h2 className="mt-2 text-2xl font-semibold">Level {levelProgress.currentLevel}</h2>
            </div>
            <Badge>{levelProgress.xpToNextLevel} XP to next</Badge>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${levelProgress.levelProgressPercent}%` }}
            />
          </div>
        </Card>
        <StatCard
          helper={`${profile?.longestStreak ?? 0} day longest streak`}
          icon={<Flame className="size-5" />}
          label="Current streak"
          value={`${profile?.currentStreak ?? 0} days`}
        />
        <StatCard
          helper="Global all-time preview"
          icon={<Trophy className="size-5" />}
          label="Leaderboard rank"
          value={globalRank?.rank ? `#${globalRank.rank}` : "--"}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Live room profile</p>
            <h2 className="mt-2 text-2xl font-semibold">Multiplayer stats</h2>
          </div>
          <Button href="/rooms/history" variant="secondary">
            View Room History
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Rooms played</p>
            <p className="mt-2 text-2xl font-semibold">{roomResults.length}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Best rank</p>
            <p className="mt-2 text-2xl font-semibold">{bestRoomRank ? `#${bestRoomRank}` : "--"}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Live accuracy</p>
            <p className="mt-2 text-2xl font-semibold">
              {roomResults.length
                ? `${Math.round(roomResults.reduce((sum, result) => sum + result.accuracy, 0) / roomResults.length)}%`
                : "--"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Matchmaking profile</p>
            <h2 className="mt-2 text-2xl font-semibold">Quick Match stats</h2>
          </div>
          <Button href="/matchmaking/quick" variant="secondary">
            Find Match
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <RadioTower className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Played</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.quickMatchesPlayed ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Trophy className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Won</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.quickMatchesWon ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Bot className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Bot-filled</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.botMatchesPlayed ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Crown className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Challenge rooms</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.challengeMatchesPlayed ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Classroom profile</p>
            <h2 className="mt-2 text-2xl font-semibold">Class and assignment stats</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/classes" variant="secondary">
              My classes
            </Button>
            {adminOverride || profile?.creatorStatus === "approved" ? (
              <Button href="/creator">
                Creator Studio
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <GraduationCap className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Joined classes</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.joinedClassCount ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Award className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Assignments</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.assignmentsCompleted ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Activity className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Assignment accuracy</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.assignmentAverageAccuracy ?? 0}%</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <Crown className="size-5 text-primary" />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Creator status</p>
            <p className="mt-2 text-2xl font-semibold">{profile?.creatorStatus ?? "none"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-5">
          <Award className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">Badge collection</h2>
          {profile?.earnedBadges.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {profile.earnedBadges.slice(0, 6).map((badge) => (
                <div className="rounded-2xl border border-border bg-surface/70 p-3" key={badge.id}>
                  <Badge>{badge.rarity}</Badge>
                  <p className="mt-2 font-semibold">{badge.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Complete quizzes to unlock your first badges.
            </p>
          )}
        </Card>
        <Card className="p-5">
          <Crown className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">Best quiz performance</h2>
          {bestAttempt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {bestAttempt.quizTitle}: {bestAttempt.score}/{bestAttempt.totalPoints} points with{" "}
              {bestAttempt.accuracy}% accuracy.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Your best saved quiz result will appear after your first attempt.
            </p>
          )}
        </Card>
      </div>

      <RecentAttemptList
        attempts={attempts}
        emptyDescription="Your completed quizzes will build a private learning timeline here."
        emptyTitle="No activity yet"
        error={attemptsError}
        loading={attemptsLoading}
      />
    </div>
  );
}
