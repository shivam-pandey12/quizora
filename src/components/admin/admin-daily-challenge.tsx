"use client";

import { CalendarDays, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import {
  dateKey,
  getCurrentDailyChallenge,
  listDailyChallenges,
  setDailyChallenge
} from "@/lib/firestore/admin-content-controls";
import { listAdminQuizzes } from "@/lib/firestore/content";
import { formatDate } from "@/lib/firestore/timestamps";
import type { DailyChallenge, Quiz } from "@/types/domain";

export function AdminDailyChallenge() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [current, setCurrent] = useState<DailyChallenge | null>(null);
  const [history, setHistory] = useState<DailyChallenge[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextQuizzes, nextCurrent, nextHistory] = await Promise.all([
        listAdminQuizzes(),
        getCurrentDailyChallenge(),
        listDailyChallenges(30)
      ]);
      setQuizzes(nextQuizzes);
      setCurrent(nextCurrent);
      setHistory(nextHistory);
      setSelectedQuizId(nextCurrent?.quizId ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load daily challenge controls.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const playableQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.status === "published" && quiz.visibility === "public" && quiz.questionCount > 0),
    [quizzes]
  );
  const selectedQuiz = playableQuizzes.find((quiz) => quiz.id === selectedQuizId) ?? null;

  async function save() {
    if (!selectedQuiz) return;
    setWorking(true);
    try {
      await setDailyChallenge(selectedQuiz, selectedDate || dateKey());
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "daily_challenge_set",
        targetType: "dailyChallenge",
        targetId: selectedDate || dateKey(),
        targetLabel: selectedQuiz.title,
        details: `Daily challenge set to ${selectedQuiz.title}.`
      });
      showToast({ tone: "success", title: "Daily challenge updated" });
      setConfirm(false);
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Daily challenge update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Daily challenge</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Daily challenge control</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Select a published public quiz for today or a scheduled date. This mirrors the active quiz with the existing daily flag.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Sparkles className="size-5" />} label="Current challenge" value={current?.quizTitle ?? "Not set"} helper={current?.dateKey ?? "Choose one"} />
        <StatCard label="Playable quizzes" value={String(playableQuizzes.length)} helper="Published public with questions" />
        <StatCard icon={<CalendarDays className="size-5" />} label="History rows" value={String(history.length)} helper="Loaded schedule" />
      </div>

      <AdminDataState empty={false} emptyDescription="" emptyTitle="" error={error} loading={loading} />

      {!loading && !error ? (
        <>
          <Card className="p-5">
            <SectionHeader className="mb-4" title="Set challenge" />
            <div className="grid gap-4 lg:grid-cols-[12rem_1fr_auto] lg:items-end">
              <label className="grid gap-2 text-sm font-semibold">
                Date
                <input
                  className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm font-medium"
                  onChange={(event) => setSelectedDate(event.target.value)}
                  type="date"
                  value={selectedDate}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Quiz
                <Select onChange={(event) => setSelectedQuizId(event.target.value)} value={selectedQuizId}>
                  <option value="">Select published quiz</option>
                  {playableQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </option>
                  ))}
                </Select>
              </label>
              <Button disabled={!selectedQuiz || working} onClick={() => setConfirm(true)}>
                Save challenge
              </Button>
            </div>
          </Card>

          <div className="grid gap-3">
            {history.map((item) => (
              <Card className="p-4" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.status}>{item.status}</StatusBadge>
                      <Badge>{item.dateKey}</Badge>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{item.quizTitle}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(item.updatedAt)}</p>
                  </div>
                  <Button href={`/play/${item.quizId}`} size="sm" variant="secondary">
                    Preview play
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        confirmLabel="Set challenge"
        description={`This will set ${selectedQuiz?.title ?? "the selected quiz"} as the daily challenge for ${selectedDate}.`}
        loading={working}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void save()}
        open={confirm}
        title="Replace daily challenge?"
      />
    </div>
  );
}
