"use client";

import {
  BarChart3,
  CalendarDays,
  DoorOpen,
  FileQuestion,
  GraduationCap,
  Layers3,
  MessageSquareWarning,
  RadioTower,
  Sparkles,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { getAdminAnalyticsSnapshot } from "@/lib/firestore/admin-analytics";
import type { AdminAnalyticsSnapshot, AdminCounts } from "@/types/domain";

const emptyCounts: AdminCounts = {
  totalQuizzes: 0,
  publishedQuizzes: 0,
  draftQuizzes: 0,
  totalCategories: 0,
  totalUsers: 0,
  totalQuestions: 0,
  featuredQuizzes: 0,
  dailyChallengeQuizzes: 0,
  totalAttempts: 0,
  attemptsToday: 0,
  averageAccuracy: 0,
  totalRooms: 0,
  activeRooms: 0,
  completedRoomsToday: 0,
  quickMatchesToday: 0,
  pendingReports: 0,
  pendingFeedback: 0,
  activeQueues: 0,
  totalClasses: 0,
  activeClasses: 0,
  approvedCreators: 0
};

export function AdminOverview() {
  const [counts, setCounts] = useState<AdminCounts>(emptyCounts);
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCounts() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }

      try {
        const nextSnapshot = await getAdminAnalyticsSnapshot();
        setSnapshot(nextSnapshot);
        setCounts(nextSnapshot.counts);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load admin counts.");
      } finally {
        setLoading(false);
      }
    }

    void loadCounts();
  }, []);

  const metrics = [
    {
      label: "Total quizzes",
      value: String(counts.totalQuizzes),
      helper: `${counts.publishedQuizzes} published`,
      icon: <FileQuestion className="size-5" />
    },
    {
      label: "Draft quizzes",
      value: String(counts.draftQuizzes),
      helper: "Waiting for questions or publish review",
      icon: <BarChart3 className="size-5" />
    },
    {
      label: "Categories",
      value: String(counts.totalCategories),
      helper: "Public lanes and hidden staging",
      icon: <Layers3 className="size-5" />
    },
    {
      label: "Users",
      value: String(counts.totalUsers),
      helper: "Profile documents",
      icon: <UsersRound className="size-5" />
    },
    {
      label: "Questions",
      value: String(counts.totalQuestions),
      helper: "Available for solo and live play",
      icon: <Trophy className="size-5" />
    },
    {
      label: "Featured",
      value: String(counts.featuredQuizzes),
      helper: `${counts.dailyChallengeQuizzes} daily challenge flags`,
      icon: <Sparkles className="size-5" />
    },
    {
      label: "Attempts",
      value: String(counts.totalAttempts),
      helper: `${counts.attemptsToday} today • ${counts.averageAccuracy}% avg`,
      icon: <BarChart3 className="size-5" />
    },
    {
      label: "Live rooms",
      value: String(counts.totalRooms),
      helper: `${counts.activeRooms} active • ${counts.completedRoomsToday} completed today`,
      icon: <DoorOpen className="size-5" />
    },
    {
      label: "Classes",
      value: String(counts.totalClasses),
      helper: `${counts.activeClasses} active • ${counts.approvedCreators} creators`,
      icon: <GraduationCap className="size-5" />
    },
    {
      label: "Quick Match",
      value: String(counts.quickMatchesToday),
      helper: `${counts.activeQueues} active queues`,
      icon: <RadioTower className="size-5" />
    },
    {
      label: "Triage",
      value: String(counts.pendingReports + counts.pendingFeedback),
      helper: `${counts.pendingReports} reports • ${counts.pendingFeedback} feedback`,
      icon: <MessageSquareWarning className="size-5" />
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Admin overview</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">
          Quizora studio command center
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Firestore counts give admins a real view of quizzes, categories,
          questions, and users without introducing advanced analytics yet.
        </p>
      </div>

      <AdminDataState
        empty={false}
        emptyDescription=""
        emptyTitle=""
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      ) : null}

      <Card className="p-6">
        <SectionHeader
          className="mb-5"
          title="Operations snapshot"
          description="A bounded admin window for content health, live systems, triage queues, and launch readiness."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            `Daily challenge: ${snapshot?.dailyChallenge?.quizTitle ?? "Not set"}`,
            `${snapshot?.contentIssues.length ?? 0} cleanup signals loaded`,
            `${snapshot?.reports.filter((report) => report.status === "open").length ?? 0} open reports`
          ].map((item) => (
            <div
              className="rounded-3xl border border-border bg-surface/70 p-4 text-sm font-semibold"
              key={item}
            >
              <CalendarDays className="mb-3 size-5 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </Card>

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <SectionHeader
              className="mb-4"
              title="Content health"
              description="Top cleanup diagnostics from bounded admin samples."
            />
            <div className="grid gap-3">
              {(snapshot?.contentIssues ?? []).slice(0, 5).map((issue) => (
                <div className="rounded-3xl border border-border bg-surface/70 p-4" key={issue.id}>
                  <p className="font-semibold">{issue.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                </div>
              ))}
              {!snapshot?.contentIssues.length ? (
                <p className="text-sm text-muted-foreground">No cleanup issues in the current bounded sample.</p>
              ) : null}
            </div>
          </Card>
          <Card className="p-6">
            <SectionHeader
              className="mb-4"
              title="Quick actions"
              description="Common launch operations without digging through every route."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["/admin/quizzes", "Create quiz"],
                ["/admin/questions", "Review questions"],
                ["/admin/reports", "View reports"],
                ["/admin/classes", "Review classes"],
                ["/admin/creators", "Approve creators"],
                ["/admin/daily-challenge", "Set daily challenge"],
                ["/admin/leaderboards", "Moderate leaderboard"],
                ["/admin/import-export", "Open data tools"]
              ].map(([href, label]) => (
                <a
                  className="rounded-3xl border border-border bg-surface/70 p-4 text-sm font-semibold transition hover:border-primary/35 hover:bg-primary/10"
                  href={href}
                  key={href}
                >
                  {label}
                </a>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
