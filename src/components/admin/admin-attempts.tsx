"use client";

import { AlertTriangle, BarChart3, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecentAttemptList } from "@/components/attempts/recent-attempt-list";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listRecentAdminAttempts } from "@/lib/firestore/attempts";
import {
  getLeaderboard,
  hideLeaderboardEntry,
  rebuildLeaderboardsFromRecentAttempts
} from "@/lib/firestore/leaderboards";
import { formatNumber, formatSeconds } from "@/lib/utils";
import type { Attempt, LeaderboardEntry } from "@/types/domain";

function suspiciousFlags(attempt: Attempt) {
  const flags: string[] = [];
  if (attempt.timeTakenSeconds > 0 && attempt.timeTakenSeconds <= Math.max(10, attempt.totalQuestions * 4)) {
    flags.push("Very low time");
  }
  if (
    attempt.totalPoints > 0 &&
    attempt.score >= attempt.totalPoints &&
    attempt.timeTakenSeconds <= Math.max(20, attempt.totalQuestions * 6)
  ) {
    flags.push("Fast perfect score");
  }
  return flags;
}

export function AdminAttempts() {
  const { showToast } = useToast();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [mode, setMode] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    async function loadAttempts() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }

      try {
        const [nextAttempts, globalLeaderboard] = await Promise.all([
          listRecentAdminAttempts(50),
          getLeaderboard({ scope: "global", periodType: "all-time", limit: 10 })
        ]);
        setAttempts(nextAttempts);
        setLeaderboardEntries(globalLeaderboard.entries);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load attempts.");
      } finally {
        setLoading(false);
      }
    }

    void loadAttempts();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return attempts.filter((attempt) =>
      (!normalized ||
        [
          attempt.quizTitle,
          attempt.userDisplayName,
          attempt.categoryName,
          attempt.difficulty
        ].some((value) => value.toLowerCase().includes(normalized))) &&
      (difficulty === "all" || attempt.difficulty === difficulty) &&
      (mode === "all" || attempt.mode === mode) &&
      (flagFilter === "all" ||
        (flagFilter === "flagged"
          ? suspiciousFlags(attempt).length > 0
          : suspiciousFlags(attempt).length === 0)) &&
      (dateFilter === "all" ||
        (attempt.completedAt &&
          new Date(attempt.completedAt).getTime() >=
            Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000))
    );
  }, [attempts, dateFilter, difficulty, flagFilter, mode, query]);

  const averageAccuracy = attempts.length
    ? Math.round(
        attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length
      )
    : 0;
  const flaggedAttempts = attempts.filter((attempt) => suspiciousFlags(attempt).length).length;

  async function rebuildLeaderboards() {
    setWorking(true);
    try {
      const rebuilt = await rebuildLeaderboardsFromRecentAttempts(200);
      const globalLeaderboard = await getLeaderboard({
        scope: "global",
        periodType: "all-time",
        limit: 10
      });
      setLeaderboardEntries(globalLeaderboard.entries);
      showToast({
        tone: "success",
        title: "Leaderboard rebuilt",
        description: `${rebuilt} completed attempts were replayed into leaderboard entries.`
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Rebuild failed",
        description: caught instanceof Error ? caught.message : "Could not rebuild leaderboards."
      });
    } finally {
      setWorking(false);
      setConfirmRebuild(false);
    }
  }

  async function hideEntry(entryId: string) {
    setWorking(true);
    try {
      await hideLeaderboardEntry(entryId);
      setLeaderboardEntries((current) => current.filter((entry) => entry.id !== entryId));
      showToast({
        tone: "success",
        title: "Leaderboard entry hidden",
        description: "Attempt history was preserved."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not hide entry",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Attempts</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">
          Attempt review stream
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Admins can review recent saved attempts, leaderboard rows, and
          lightweight suspicious signals. This remains visibility-first tooling,
          not server-authoritative anti-cheat.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          helper="Most recent saved attempts"
          icon={<BarChart3 className="size-5" />}
          label="Loaded attempts"
          value={String(attempts.length)}
        />
        <StatCard
          helper="For this loaded window only"
          icon={<ShieldCheck className="size-5" />}
          label="Average accuracy"
          value={`${averageAccuracy}%`}
        />
        <StatCard
          helper="Client-written and rebuildable"
          label="Leaderboard writes"
          value="On"
        />
        <StatCard
          helper="Placeholder signals for manual review"
          icon={<AlertTriangle className="size-5" />}
          label="Suspicious flags"
          value={String(flaggedAttempts)}
        />
      </div>

      <Card className="p-4">
        <SectionHeader
          className="mb-4"
          title="Recent attempt records"
          description="Search by player, quiz, category, or difficulty."
        />
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search attempts"
            value={query}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </Select>
          <Select onChange={(event) => setMode(event.target.value)} value={mode}>
            <option value="all">All modes</option>
            <option value="solo">Solo</option>
            <option value="live-room">Live room</option>
          </Select>
          <Select onChange={(event) => setFlagFilter(event.target.value)} value={flagFilter}>
            <option value="all">All review signals</option>
            <option value="flagged">Suspicious only</option>
            <option value="clear">No flags</option>
          </Select>
          <Select onChange={(event) => setDateFilter(event.target.value)} value={dateFilter}>
            <option value="all">All loaded dates</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={false}
        emptyDescription=""
        emptyTitle=""
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <>
          <div className="grid gap-3">
            {filtered.map((attempt) => {
              const flags = suspiciousFlags(attempt);
              return (
                <div key={attempt.id}>
                  <RecentAttemptList
                    attempts={[attempt]}
                    error={null}
                    loading={false}
                    showUser
                  />
                  {flags.length ? (
                    <div className="-mt-2 mb-2 flex flex-wrap gap-2 px-2">
                      {flags.map((flag) => (
                        <Badge
                          className="border-warning/20 bg-warning/10 text-warning"
                          key={flag}
                        >
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {!filtered.length ? (
            <RecentAttemptList
              attempts={[]}
              emptyDescription="Completed attempts will appear here after players submit quizzes."
              emptyTitle="No attempts found"
              error={null}
              loading={false}
              showUser
            />
          ) : null}
        </>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Leaderboard moderation"
            description="Hide leaderboard rows without deleting private attempt history."
          />
          <Button
            disabled={working}
            icon={<RefreshCw className="size-4" />}
            onClick={() => setConfirmRebuild(true)}
            variant="secondary"
          >
            Rebuild latest 200
          </Button>
        </div>
        <div className="mt-5 grid gap-3">
          {leaderboardEntries.map((entry) => (
            <div
              className="flex flex-col gap-3 rounded-3xl border border-border bg-surface/70 p-4 md:flex-row md:items-center md:justify-between"
              key={entry.id}
            >
              <div>
                <p className="font-semibold">
                  #{entry.rank} {entry.userDisplayName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.quizTitle} • {formatNumber(entry.score)} pts •{" "}
                  {formatSeconds(entry.timeTakenSeconds)}
                </p>
              </div>
              <Button
                disabled={working}
                onClick={() => void hideEntry(entry.id)}
                size="sm"
                variant="danger"
              >
                Hide entry
              </Button>
            </div>
          ))}
          {!leaderboardEntries.length ? (
            <p className="text-sm text-muted-foreground">No global leaderboard rows loaded yet.</p>
          ) : null}
        </div>
      </Card>

      <ConfirmDialog
        confirmLabel="Rebuild"
        description="This replays the latest 200 completed attempts into deterministic leaderboard entries. Existing attempts are not deleted."
        loading={working}
        onCancel={() => setConfirmRebuild(false)}
        onConfirm={() => void rebuildLeaderboards()}
        open={confirmRebuild}
        title="Rebuild leaderboard entries?"
      />
    </div>
  );
}
