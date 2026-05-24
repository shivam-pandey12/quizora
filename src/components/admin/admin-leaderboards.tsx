"use client";

import { Search, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import {
  listAdminLeaderboardEntries,
  moderateLeaderboardEntry
} from "@/lib/firestore/leaderboards";
import { formatDate } from "@/lib/firestore/timestamps";
import { formatNumber, formatSeconds, titleCase } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardScope } from "@/types/domain";

export function AdminLeaderboards() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<LeaderboardScope | "all">("all");
  const [visibility, setVisibility] = useState("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextEntries = await listAdminLeaderboardEntries(140);
      setEntries(nextEntries);
      setReasons(Object.fromEntries(nextEntries.map((entry) => [entry.id, entry.hiddenReason])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load leaderboards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        !normalized ||
        [entry.userDisplayName, entry.quizTitle, entry.categoryName, entry.attemptId].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesScope = scope === "all" || entry.scope === scope;
      const matchesVisibility =
        visibility === "all" ||
        (visibility === "hidden" && entry.hidden) ||
        (visibility === "visible" && !entry.hidden) ||
        (visibility === "suspicious" && entry.suspicious);
      return matchesQuery && matchesScope && matchesVisibility;
    });
  }, [entries, query, scope, visibility]);

  async function moderate(entry: LeaderboardEntry, updates: Partial<Pick<LeaderboardEntry, "hidden" | "suspicious" | "reviewed">>) {
    setWorking(true);
    try {
      const nextHidden = updates.hidden ?? entry.hidden;
      const nextSuspicious = updates.suspicious ?? entry.suspicious;
      const nextReviewed = updates.reviewed ?? entry.reviewed;
      await moderateLeaderboardEntry({
        entryId: entry.id,
        hidden: nextHidden,
        suspicious: nextSuspicious,
        reviewed: nextReviewed,
        hiddenReason: reasons[entry.id] ?? "",
        moderatedBy: user?.uid ?? "unknown"
      });
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "leaderboard_moderated",
        targetType: "leaderboard",
        targetId: entry.id,
        targetLabel: entry.userDisplayName,
        details: `hidden=${nextHidden}; suspicious=${nextSuspicious}; reviewed=${nextReviewed}`
      });
      showToast({ tone: "success", title: "Leaderboard entry updated" });
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Leaderboard update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  const hidden = entries.filter((entry) => entry.hidden).length;
  const suspicious = entries.filter((entry) => entry.suspicious).length;
  const bots = entries.filter((entry) => entry.userId.startsWith("bot_")).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Leaderboards</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Leaderboard moderation</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Hide, review, and flag leaderboard rows while preserving the underlying attempt history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<Trophy className="size-5" />} label="Loaded rows" value={String(entries.length)} helper="Recent moderation sample" />
        <StatCard label="Hidden" value={String(hidden)} helper="Not public" />
        <StatCard label="Suspicious" value={String(suspicious)} helper="Admin-only flag" />
        <StatCard label="Bot leaks" value={String(bots)} helper="Should be zero" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search user, quiz, attempt" value={query} />
          </label>
          <Select onChange={(event) => setScope(event.target.value as typeof scope)} value={scope}>
            <option value="all">All scopes</option>
            <option value="global">Global</option>
            <option value="quiz">Quiz</option>
            <option value="category">Category</option>
          </Select>
          <Select onChange={(event) => setVisibility(event.target.value)} value={visibility}>
            <option value="all">All rows</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="suspicious">Suspicious</option>
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Leaderboard entries appear after completed attempts update rank rows."
        emptyTitle="No leaderboard rows found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((entry) => (
            <Card className="p-4" key={entry.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={entry.hidden ? "archived" : "active"}>{entry.hidden ? "Hidden" : "Visible"}</StatusBadge>
                    {entry.suspicious ? <Badge className="text-warning">Suspicious</Badge> : null}
                    {entry.reviewed ? <Badge className="text-primary">Reviewed</Badge> : null}
                    <Badge>{titleCase(entry.scope)}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{entry.userDisplayName}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {entry.quizTitle} • {formatNumber(entry.score)} pts • {entry.accuracy}% • {formatSeconds(entry.timeTakenSeconds)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Attempt {entry.attemptId} • {formatDate(entry.completedAt)}
                  </p>
                </div>
                <div className="grid gap-3">
                  <Textarea
                    onChange={(event) => setReasons((current) => ({ ...current, [entry.id]: event.target.value }))}
                    placeholder="Hidden/review reason"
                    value={reasons[entry.id] ?? ""}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={working} onClick={() => void moderate(entry, { hidden: !entry.hidden, reviewed: true })} size="sm" variant={entry.hidden ? "secondary" : "danger"}>
                      {entry.hidden ? "Unhide" : "Hide"}
                    </Button>
                    <Button disabled={working} onClick={() => void moderate(entry, { suspicious: !entry.suspicious })} size="sm" variant="secondary">
                      {entry.suspicious ? "Clear flag" : "Flag"}
                    </Button>
                    <Button disabled={working} onClick={() => void moderate(entry, { reviewed: true })} size="sm">
                      Reviewed
                    </Button>
                    <Button href={`/result/${entry.attemptId}`} size="sm" variant="secondary">
                      Attempt
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
