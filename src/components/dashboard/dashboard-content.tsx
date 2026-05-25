"use client";

import { Award, BarChart3, Bot, BookOpen, DoorOpen, Flame, GraduationCap, Percent, RadioTower, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { RecentAttemptList } from "@/components/attempts/recent-attempt-list";
import { PlanBadge, UpgradeCard } from "@/components/billing/billing-ui";
import { QuizCard } from "@/components/quizzes/quiz-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { sampleQuizzes } from "@/data/sample-data";
import { useAuth } from "@/lib/auth/auth-provider";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { listRecentUserAttempts } from "@/lib/firestore/attempts";
import { getCurrentUserRank } from "@/lib/firestore/leaderboards";
import { listUserRoomHistory } from "@/lib/firestore/rooms";
import { listUserFlashHistory } from "@/lib/firestore/flash";
import { getLevelProgress } from "@/lib/quiz/xp";
import type { Attempt, FlashQuiz, FlashResult, LeaderboardEntry, RoomResult } from "@/types/domain";

const icons = [
  <Trophy className="size-5" key="played" />,
  <Percent className="size-5" key="accuracy" />,
  <GraduationCap className="size-5" key="level" />,
  <Flame className="size-5" key="streak" />
];

export function DashboardContent() {
  const { profile, user } = useAuth();
  const { plan, entitlement } = useEntitlement();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [globalRank, setGlobalRank] = useState<LeaderboardEntry | null>(null);
  const [roomResults, setRoomResults] = useState<RoomResult[]>([]);
  const [flashHosted, setFlashHosted] = useState<FlashQuiz[]>([]);
  const [flashResults, setFlashResults] = useState<FlashResult[]>([]);
  const name = profile?.displayName || "Quizora Player";
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
        const nextAttempts = await listRecentUserAttempts(currentUser.uid, 5);
        if (mounted) setAttempts(nextAttempts);
      } catch (caught) {
        if (mounted) {
          setAttemptsError(
            caught instanceof Error ? caught.message : "Could not load recent attempts."
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
    async function loadRooms() {
      try {
        const history = await listUserRoomHistory(currentUser.uid, 4);
        if (mounted) setRoomResults(history.results);
      } catch {
        if (mounted) setRoomResults([]);
      }
    }

    void loadRooms();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let mounted = true;
    async function loadFlash() {
      try {
        const history = await listUserFlashHistory(currentUser.uid, 4);
        if (mounted) {
          setFlashHosted(history.hosted);
          setFlashResults(history.results);
        }
      } catch {
        if (mounted) {
          setFlashHosted([]);
          setFlashResults([]);
        }
      }
    }

    void loadFlash();
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

  const metrics = [
    {
      label: "Quizzes played",
      value: String(profile?.totalQuizzesPlayed ?? attempts.length),
      helper: "Completed saved attempts",
      icon: icons[0]
    },
    {
      label: "Average accuracy",
      value: `${profile?.averageAccuracy ?? 0}%`,
      helper: "Updated after each completed attempt",
      icon: icons[1]
    },
    {
      label: "Level",
      value: String(profile?.level ?? 1),
      helper: `${profile?.xp ?? 0} XP banked`,
      icon: icons[2]
    },
    {
      label: "Streak",
      value: `${profile?.currentStreak ?? 0} days`,
      helper: `${profile?.longestStreak ?? 0} day best`,
      icon: icons[3]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Dashboard</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
            Welcome back, {name}.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Your quiz command center is live. Attempts, accuracy, XP, and recent
            reviews update after completed quizzes.
          </p>
        </div>
        <Card className="p-5">
          <BarChart3 className="size-8 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold">Learning profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            UID, role, XP, level, and activity timestamps are saved in Firestore.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PlanBadge plan={plan} />
            {entitlement?.expiresAt ? (
              <Badge>Expires {new Date(entitlement.expiresAt).toLocaleDateString()}</Badge>
            ) : null}
          </div>
        </Card>
      </div>

      {plan.id === "free" ? (
        <UpgradeCard
          title="Ready for more Quizora?"
          description="Plus, Creator, and Classroom passes unlock richer analytics, larger workflows, exports, and premium room/classroom limits."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            helper={metric.helper}
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">XP progress</p>
              <h2 className="mt-2 text-2xl font-semibold">Level {levelProgress.currentLevel}</h2>
            </div>
            <Badge>{levelProgress.xpToNextLevel} XP to next</Badge>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${levelProgress.levelProgressPercent}%` }}
            />
          </div>
        </Card>
        <Card className="p-5">
          <BarChart3 className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">
            {globalRank?.rank ? `#${globalRank.rank}` : "Unranked"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {globalRank ? "Global all-time leaderboard position." : "Complete quizzes to enter global rankings."}
          </p>
        </Card>
        <Card className="p-5">
          <Award className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">
            {profile?.earnedBadges.length ?? 0} badges
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.lastBadgeUnlocks[0]?.name ?? "Badge unlocks appear after attempts."}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Live rooms</p>
            <h2 className="mt-2 text-2xl font-semibold">Recent multiplayer results</h2>
          </div>
          <Button href="/rooms/history" icon={<DoorOpen className="size-4" />} variant="secondary">
            Room History
          </Button>
        </div>
        {roomResults.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {roomResults.slice(0, 4).map((result) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={result.id}>
                <Badge className="text-primary">#{result.rank} • {result.roomCode}</Badge>
                <h3 className="mt-3 text-xl font-semibold">{result.score}/{result.totalPoints} points</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.accuracy}% accuracy • +{result.xpEarned} XP
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Live-room results will appear here after your first completed multiplayer session.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Flash Quizzes</p>
            <h2 className="mt-2 text-2xl font-semibold">Temporary quiz activity</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Flash results are temporary and do not update permanent attempts, XP, or global leaderboards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/flash/create" icon={<RadioTower className="size-4" />}>Create Flash</Button>
            <Button href="/flash/history" variant="secondary">Flash History</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <StatCard label="Hosted Flash" value={String(flashHosted.length)} helper="Recent temporary quizzes" />
          <StatCard label="Played Flash" value={String(flashResults.length)} helper="Recent temporary results" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          helper={`${profile?.quickMatchesWon ?? 0} quick wins`}
          icon={<RadioTower className="size-5" />}
          label="Quick matches"
          value={String(profile?.quickMatchesPlayed ?? 0)}
        />
        <StatCard
          helper="Best quick-match podium rank"
          icon={<Trophy className="size-5" />}
          label="Best quick rank"
          value={profile?.quickMatchBestRank ? `#${profile.quickMatchBestRank}` : "--"}
        />
        <StatCard
          helper={`${profile?.botMatchesPlayed ?? 0} bot-filled matches`}
          icon={<Bot className="size-5" />}
          label="Quick accuracy"
          value={profile?.quickMatchAverageAccuracy ? `${profile.quickMatchAverageAccuracy}%` : "--"}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Classes</p>
            <h2 className="mt-2 text-2xl font-semibold">Classroom progress</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Joined classes, assignment completions, and creator access now live in your profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/classes" icon={<GraduationCap className="size-4" />} variant="secondary">
              My classes
            </Button>
            {adminOverride || profile?.creatorStatus === "approved" ? (
              <Button href="/creator" icon={<BookOpen className="size-4" />}>
                Creator studio
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatCard label="Joined classes" value={String(profile?.joinedClassCount ?? 0)} helper="Private class memberships" />
          <StatCard label="Assignments" value={String(profile?.assignmentsCompleted ?? 0)} helper="Submitted classroom work" />
          <StatCard label="Assignment accuracy" value={`${profile?.assignmentAverageAccuracy ?? 0}%`} helper="Classroom average" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <SectionHeader
            className="mb-5"
            title="Recent attempts"
            description="Saved attempt snapshots let you reopen results even if quiz content changes later."
          />
          <RecentAttemptList
            attempts={attempts}
            emptyDescription="Start a published quiz and submit it to see your first review here."
            emptyTitle="No saved attempts yet"
            error={attemptsError}
            loading={attemptsLoading}
          />
        </div>
        <div>
          <SectionHeader
            className="mb-5"
            title="Personal best"
            description="Your strongest recent result and simple recommendations."
          />
          {bestAttempt ? (
            <Card className="mb-4 p-5">
              <Trophy className="size-7 text-primary" />
              <h3 className="mt-3 text-2xl font-semibold">{bestAttempt.quizTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {bestAttempt.score}/{bestAttempt.totalPoints} points • {bestAttempt.accuracy}% accuracy
              </p>
            </Card>
          ) : null}
          <div className="grid gap-4">
            {sampleQuizzes.slice(0, 2).map((quiz) => (
              <QuizCard key={quiz.slug} quiz={quiz} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
