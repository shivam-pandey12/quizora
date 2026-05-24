"use client";

import { AlertTriangle, ShieldCheck, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listRecentAdminAttempts, updateAttemptSecurityReview } from "@/lib/firestore/attempts";
import { listAdminLeaderboardEntries, moderateLeaderboardEntry } from "@/lib/firestore/leaderboards";
import { formatDate } from "@/lib/firestore/timestamps";
import { formatSeconds } from "@/lib/utils";
import type { Attempt, LeaderboardEntry } from "@/types/domain";

function attemptSignals(attempt: Attempt) {
  const explicit = attempt.securityFlags.map((flag) => flag.message || flag.code);
  const legacy: string[] = [];
  if (!attempt.trusted) legacy.push("Legacy client-scored attempt");
  if (attempt.timeTakenSeconds > 0 && attempt.timeTakenSeconds <= Math.max(10, attempt.totalQuestions * 4)) {
    legacy.push("Very low completion time");
  }
  if (attempt.hiddenFromLeaderboard) legacy.push("Hidden from leaderboard");
  return [...explicit, ...legacy];
}

export function AdminSecurity() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("flagged");
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextAttempts, nextEntries] = await Promise.all([
        listRecentAdminAttempts(100),
        listAdminLeaderboardEntries(120)
      ]);
      setAttempts(nextAttempts);
      setEntries(nextEntries);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load security review data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredAttempts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return attempts.filter((attempt) => {
      const signals = attemptSignals(attempt);
      const matchesQuery =
        !normalized ||
        [attempt.userDisplayName, attempt.quizTitle, attempt.id, attempt.quizId].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesFilter =
        filter === "all" ||
        (filter === "flagged" && (signals.length > 0 || attempt.reviewStatus === "flagged")) ||
        (filter === "trusted" && attempt.trusted) ||
        (filter === "legacy" && !attempt.trusted);
      return matchesQuery && matchesFilter;
    });
  }, [attempts, filter, query]);

  const flaggedAttempts = attempts.filter((attempt) => attemptSignals(attempt).length || attempt.reviewStatus === "flagged").length;
  const legacyAttempts = attempts.filter((attempt) => !attempt.trusted).length;
  const untrustedRows = entries.filter((entry) => !entry.trusted || entry.botEntry).length;

  async function hideEntry(entry: LeaderboardEntry, hidden: boolean) {
    setWorking(entry.id);
    try {
      await moderateLeaderboardEntry({
        entryId: entry.id,
        hidden,
        suspicious: entry.suspicious,
        reviewed: true,
        hiddenReason: hidden ? "Hidden from Phase 14 security review" : "",
        moderatedBy: "admin-security"
      });
      await load();
    } finally {
      setWorking(null);
    }
  }

  async function reviewAttempt(attempt: Attempt, action: "reviewed" | "cleared" | "hidden") {
    const key = `${attempt.id}-${action}`;
    setWorking(key);
    try {
      await updateAttemptSecurityReview({
        attemptId: attempt.id,
        reviewStatus: action,
        hiddenFromLeaderboard: action === "hidden" ? true : action === "cleared" ? false : attempt.hiddenFromLeaderboard,
        adminNote: `Phase 14 security review: ${action}`
      });
      await load();
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Security</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Trusted scoring review</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Review server-scored attempts, legacy client-scored records, and leaderboard rows that need manual moderation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<ShieldCheck className="size-5" />} label="Loaded attempts" value={String(attempts.length)} helper="Recent review window" />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Flagged" value={String(flaggedAttempts)} helper="Signals or review flags" />
        <StatCard label="Legacy" value={String(legacyAttempts)} helper="Client-scored history" />
        <StatCard label="Untrusted rows" value={String(untrustedRows)} helper="Leaderboard rows to review" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Attempt filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search player, quiz, attempt" value={query} />
          </label>
          <Select onChange={(event) => setFilter(event.target.value)} value={filter}>
            <option value="flagged">Flagged/review</option>
            <option value="trusted">Trusted only</option>
            <option value="legacy">Legacy only</option>
            <option value="all">All attempts</option>
          </Select>
        </div>
      </Card>

      <AdminDataState empty={!filteredAttempts.length} emptyDescription="Security signals appear after trusted attempts and room results are saved." emptyTitle="No matching attempts" error={error} loading={loading} />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filteredAttempts.map((attempt) => {
            const signals = attemptSignals(attempt);
            return (
              <Card className="p-4" key={attempt.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={attempt.trusted ? "text-success" : "text-warning"}>{attempt.trusted ? "Trusted" : "Legacy"}</Badge>
                      <Badge>{attempt.scoringSource}</Badge>
                      {attempt.reviewStatus !== "none" ? <Badge className="text-warning">{attempt.reviewStatus}</Badge> : null}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">{attempt.quizTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {attempt.userDisplayName} • {attempt.score}/{attempt.totalPoints} • {formatSeconds(attempt.timeTakenSeconds)} • {formatDate(attempt.completedAt)}
                    </p>
                    {signals.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {signals.map((signal) => <Badge className="text-warning" key={signal}>{signal}</Badge>)}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button href={`/result/${attempt.id}`} size="sm" variant="secondary">Open result</Button>
                    {attempt.roomId ? <Button href={`/admin/rooms/${attempt.roomId}`} size="sm" variant="secondary">Room</Button> : null}
                    <Button disabled={working === `${attempt.id}-reviewed`} onClick={() => void reviewAttempt(attempt, "reviewed")} size="sm" variant="secondary">
                      Mark reviewed
                    </Button>
                    <Button disabled={working === `${attempt.id}-cleared`} onClick={() => void reviewAttempt(attempt, "cleared")} size="sm" variant="secondary">
                      Clear flag
                    </Button>
                    <Button disabled={working === `${attempt.id}-hidden`} onClick={() => void reviewAttempt(attempt, "hidden")} size="sm" variant="danger">
                      Hide score
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card className="p-5">
        <SectionHeader title="Leaderboard trust review" description="Public leaderboards now prefer trusted server-scored rows. Legacy rows stay available for admin review." />
        <div className="mt-5 grid gap-3">
          {entries.slice(0, 30).map((entry) => (
            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface/70 p-4 lg:flex-row lg:items-center lg:justify-between" key={entry.id}>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={entry.trusted ? "text-success" : "text-warning"}>{entry.trusted ? "Trusted" : "Legacy"}</Badge>
                  {entry.hidden ? <Badge>Hidden</Badge> : null}
                  {entry.botEntry ? <Badge className="text-warning">Bot row</Badge> : null}
                </div>
                <p className="mt-2 font-semibold">{entry.userDisplayName} • {entry.quizTitle}</p>
                <p className="text-sm text-muted-foreground">{entry.score} pts • attempt {entry.attemptId}</p>
              </div>
              <Button disabled={working === entry.id} onClick={() => void hideEntry(entry, !entry.hidden)} size="sm" variant={entry.hidden ? "secondary" : "danger"}>
                {entry.hidden ? "Restore" : "Hide"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
