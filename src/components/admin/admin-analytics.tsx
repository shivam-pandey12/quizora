"use client";

import { BarChart3, DoorOpen, FileQuestion, RadioTower, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  getAdminAnalyticsSnapshot,
  listQuizPerformanceRows
} from "@/lib/firestore/admin-analytics";
import { formatSeconds } from "@/lib/utils";
import type { AdminAnalyticsSnapshot } from "@/types/domain";

type QuizPerformanceRow = Awaited<ReturnType<typeof listQuizPerformanceRows>>[number];

export function AdminAnalytics() {
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const [quizRows, setQuizRows] = useState<QuizPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }

      try {
        const [nextSnapshot, nextQuizRows] = await Promise.all([
          getAdminAnalyticsSnapshot(),
          listQuizPerformanceRows(40)
        ]);
        setSnapshot(nextSnapshot);
        setQuizRows(nextQuizRows);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const counts = snapshot?.counts;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Analytics</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Launch analytics command deck</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Bounded operational analytics for content, attempts, rooms, matchmaking, and triage. Exact long-term trends should move to scheduled aggregation later.
        </p>
      </div>

      <AdminDataState empty={false} emptyDescription="" emptyTitle="" error={error} loading={loading} />

      {counts && !loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<FileQuestion className="size-5" />} label="Published quizzes" value={String(counts.publishedQuizzes)} helper={`${counts.draftQuizzes} drafts`} />
            <StatCard icon={<BarChart3 className="size-5" />} label="Attempts" value={String(counts.totalAttempts)} helper={`${counts.attemptsToday} today`} />
            <StatCard icon={<DoorOpen className="size-5" />} label="Rooms" value={String(counts.totalRooms)} helper={`${counts.activeRooms} active`} />
            <StatCard icon={<RadioTower className="size-5" />} label="Quick matches" value={String(counts.quickMatchesToday)} helper={`${counts.activeQueues} active queues`} />
          </div>

          <Card className="p-5">
            <SectionHeader
              className="mb-4"
              title="Quiz performance sample"
              description="Recent attempts are sampled to identify quizzes that may need content review."
            />
            <div className="grid gap-3">
              {quizRows.slice(0, 12).map((row) => (
                <div
                  className="grid gap-3 rounded-3xl border border-border bg-surface/70 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                  key={row.quiz.id}
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={row.status === "review-needed" ? "text-warning" : "text-primary"}>
                        {row.status === "review-needed" ? "Review needed" : row.status === "needs-questions" ? "Needs questions" : "Healthy"}
                      </Badge>
                      <Badge>{row.quiz.status}</Badge>
                      <Badge>{row.quiz.difficulty}</Badge>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{row.quiz.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.attempts} sampled attempts • {row.uniquePlayers} players • {row.averageAccuracy}% avg accuracy • {formatSeconds(row.averageTimeSeconds)} avg time
                    </p>
                  </div>
                  <Badge>{row.averageScore} avg score</Badge>
                </div>
              ))}
              {!quizRows.length ? (
                <p className="text-sm text-muted-foreground">No quiz attempt sample is available yet.</p>
              ) : null}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionHeader className="mb-4" title="Triage queues" />
              <div className="grid gap-3">
                <StatCard icon={<ShieldAlert className="size-5" />} label="Reports pending" value={String(counts.pendingReports)} helper="Open or reviewing" />
                <StatCard label="Feedback pending" value={String(counts.pendingFeedback)} helper="New or reviewing" />
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader className="mb-4" title="Current daily challenge" />
              <p className="text-2xl font-semibold">
                {snapshot.dailyChallenge?.quizTitle ?? "Not selected"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {snapshot.dailyChallenge
                  ? `${snapshot.dailyChallenge.dateKey} • ${snapshot.dailyChallenge.status}`
                  : "Set a daily challenge from the admin controls."}
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
