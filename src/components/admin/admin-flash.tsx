"use client";

import { AlertTriangle, Archive, Clock, Eye, FileQuestion, RadioTower, Search, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  archiveFlashQuizClient,
  getFlashQuizById,
  listFlashPlayersOnce,
  listFlashQuestions,
  listFlashReports,
  listFlashResultsOnce,
  listRecentAdminFlashQuizzes
} from "@/lib/firestore/flash";
import type { FlashPlayer, FlashQuestion, FlashQuiz, FlashReport, FlashResult } from "@/types/domain";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

function statusClass(status: FlashQuiz["status"]) {
  if (status === "running") return "border-success/25 bg-success/10 text-success";
  if (status === "archived" || status === "expired") return "border-danger/25 bg-danger/10 text-danger";
  return "text-primary";
}

export function AdminFlashPage() {
  const [items, setItems] = useState<FlashQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FlashQuiz["status"] | "all">("all");
  const [mode, setMode] = useState<FlashQuiz["mode"] | "all">("all");
  const [search, setSearch] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    listRecentAdminFlashQuizzes(100)
      .then(setItems)
      .catch((caught) => showToast({ tone: "error", title: "Flash monitor unavailable", description: caught instanceof Error ? caught.message : "Could not load Flash Quizzes." }))
      .finally(() => setLoading(false));
  }, [showToast]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = status === "all" || item.status === status;
      const matchesMode = mode === "all" || item.mode === mode;
      const matchesSearch =
        !normalized ||
        [item.title, item.flashCode, item.hostName, item.description].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesMode && matchesSearch;
    });
  }, [items, mode, search, status]);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Flash Quiz monitor" description="Review temporary Quizora Flash Quizzes, active sessions, reports, hosts, players, and expiry state." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<RadioTower className="size-5" />} label="Loaded" value={String(items.length)} helper="Recent Flash Quizzes" />
        <StatCard icon={<Clock className="size-5" />} label="Running" value={String(items.filter((item) => item.status === "running").length)} helper="Live now" />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Reported" value={String(items.filter((item) => item.antiAbuse.reportCount > 0).length)} helper="Needs review" />
        <StatCard icon={<UsersRound className="size-5" />} label="Players" value={String(items.reduce((sum, item) => sum + item.playerCount, 0))} helper="Across loaded sessions" />
      </div>
      <Card className="mt-6 p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <label className="relative">
            <Search className="absolute left-4 top-3.5 size-4 text-muted-foreground" />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, title, or host" />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value as FlashQuiz["status"] | "all")}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="running">Running</option>
            <option value="ended">Ended</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </Select>
          <Select value={mode} onChange={(event) => setMode(event.target.value as FlashQuiz["mode"] | "all")}>
            <option value="all">All modes</option>
            <option value="live">Live</option>
            <option value="self-paced">Self-paced</option>
          </Select>
        </div>
      </Card>
      <div className="mt-6 grid gap-4">
        {loading ? <LoadingSkeleton variant="card" /> : null}
        {!loading && filtered.map((item) => (
          <Card className="p-5" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusClass(item.status)}>{item.status}</Badge>
                  <Badge>{item.mode}</Badge>
                  {item.antiAbuse.reportCount ? <Badge className="border-danger/25 bg-danger/10 text-danger">{item.antiAbuse.reportCount} reports</Badge> : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.flashCode} · {item.hostName} · expires {formatDate(item.expiresAt)}</p>
              </div>
              <Button href={`/admin/flash/${item.id}`} icon={<Eye className="size-4" />} variant="secondary">View</Button>
            </div>
          </Card>
        ))}
        {!loading && !filtered.length ? <EmptyState icon={RadioTower} title="No Flash Quizzes match" description="Try a different filter or wait for user-created Flash activity." /> : null}
      </div>
    </>
  );
}

export function AdminFlashDetailPage({ flashQuizId }: { flashQuizId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [flashQuiz, setFlashQuiz] = useState<FlashQuiz | null>(null);
  const [questions, setQuestions] = useState<FlashQuestion[]>([]);
  const [players, setPlayers] = useState<FlashPlayer[]>([]);
  const [results, setResults] = useState<FlashResult[]>([]);
  const [reports, setReports] = useState<FlashReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const quiz = await getFlashQuizById(flashQuizId);
      setFlashQuiz(quiz);
      if (quiz) {
        const [nextQuestions, nextPlayers, nextResults, nextReports] = await Promise.all([
          listFlashQuestions(quiz.id),
          listFlashPlayersOnce(quiz.id),
          listFlashResultsOnce(quiz.id),
          listFlashReports(quiz.id)
        ]);
        setQuestions(nextQuestions);
        setPlayers(nextPlayers);
        setResults(nextResults);
        setReports(nextReports);
      }
    } catch (caught) {
      showToast({ tone: "error", title: "Flash detail unavailable", description: caught instanceof Error ? caught.message : "Could not load detail." });
    } finally {
      setLoading(false);
    }
  }, [flashQuizId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function archive() {
    if (!user) return;
    try {
      await archiveFlashQuizClient(user, flashQuizId);
      showToast({ tone: "success", title: "Flash Quiz archived" });
      setConfirmArchive(false);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Archive failed", description: caught instanceof Error ? caught.message : "Try again." });
    }
  }

  if (loading) return <LoadingSkeleton variant="page" />;
  if (!flashQuiz) return <EmptyState icon={AlertTriangle} title="Flash Quiz not found" description="This temporary quiz may have been removed." />;

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Admin Flash detail" title={flashQuiz.title} description={`${flashQuiz.flashCode} · ${flashQuiz.mode} · hosted by ${flashQuiz.hostName}`}>
        <Button icon={<Archive className="size-4" />} onClick={() => setConfirmArchive(true)} variant="danger">Archive</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<FileQuestion className="size-5" />} label="Questions" value={String(questions.length)} helper={`${flashQuiz.totalPoints} points`} />
        <StatCard icon={<UsersRound className="size-5" />} label="Players" value={String(players.length)} helper={`${flashQuiz.playerCount}/${flashQuiz.maxPlayers}`} />
        <StatCard icon={<Clock className="size-5" />} label="Expiry" value={flashQuiz.status} helper={formatDate(flashQuiz.expiresAt)} />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Reports" value={String(reports.length)} helper="Open and reviewed" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Questions</h2>
          <div className="mt-5 grid gap-3">
            {questions.map((question) => (
              <div className="rounded-2xl border border-border bg-surface/70 p-3" key={question.id}>
                <p className="font-semibold">{question.order + 1}. {question.questionText}</p>
                <p className="mt-1 text-sm text-muted-foreground">{question.type} · {question.points} points · answer kept admin/host-only</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Players and results</h2>
          <div className="mt-5 grid gap-3">
            {(results.length ? results : players).map((item) => (
              <div className="rounded-2xl border border-border bg-surface/70 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{"displayName" in item ? item.displayName : "Player"}</p>
                  <Badge>{("rank" in item && item.rank) || "-"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{"score" in item ? item.score : 0} points</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Reports</h2>
        <div className="mt-5 grid gap-3">
          {reports.map((report) => (
            <div className="rounded-2xl border border-border bg-surface/70 p-3" key={report.id}>
              <Badge>{report.status}</Badge>
              <p className="mt-2 font-semibold">{report.reason}</p>
              <p className="text-sm text-muted-foreground">{report.details || "No details provided."}</p>
            </div>
          ))}
          {!reports.length ? <p className="text-sm text-muted-foreground">No reports for this Flash Quiz.</p> : null}
        </div>
      </Card>
      <ConfirmDialog
        confirmLabel="Archive Flash Quiz"
        description={`This archives "${flashQuiz.title}" and prevents further Flash Quiz activity. Existing admin records, reports, and results remain viewable.`}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => void archive()}
        open={confirmArchive}
        title="Archive this Flash Quiz?"
      />
    </div>
  );
}
