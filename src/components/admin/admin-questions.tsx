"use client";

import { AlertTriangle, FileQuestion, Search } from "lucide-react";
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
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listQuestionQualityRows } from "@/lib/firestore/admin-analytics";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import { setQuestionStatus } from "@/lib/firestore/content";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { QuestionQualityRow, QuizDifficulty } from "@/types/domain";

export function AdminQuestions() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState<QuestionQualityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [signal, setSignal] = useState("all");
  const [difficulty, setDifficulty] = useState<"all" | QuizDifficulty>("all");

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listQuestionQualityRows(140));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load question quality.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized ||
        [row.question.questionText, row.quizTitle, row.categoryName].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesSignal =
        signal === "all" ||
        (signal === "review" && row.reviewNeeded) ||
        (signal === "reported" && row.reportCount > 0) ||
        (signal === "missing-explanation" && !row.question.explanation.trim()) ||
        (signal === "low-correct" && row.timesAnswered >= 3 && row.correctRate < 45);
      const matchesDifficulty = difficulty === "all" || row.difficulty === difficulty;
      return matchesQuery && matchesSignal && matchesDifficulty;
    });
  }, [difficulty, query, rows, signal]);

  const reviewNeeded = rows.filter((row) => row.reviewNeeded).length;
  const reported = rows.filter((row) => row.reportCount > 0).length;
  const missingExplanations = rows.filter((row) => !row.question.explanation.trim()).length;

  async function toggleQuestion(row: QuestionQualityRow) {
    setWorking(true);
    const nextStatus = row.question.status === "active" ? "hidden" : "active";
    try {
      await setQuestionStatus(row.question.id, row.question.quizId, nextStatus);
      setRows((current) =>
        current.map((item) =>
          item.question.id === row.question.id
            ? { ...item, question: { ...item.question, status: nextStatus } }
            : item
        )
      );
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: nextStatus === "active" ? "question_unhidden" : "question_hidden",
        targetType: "question",
        targetId: row.question.id,
        targetLabel: row.question.questionText,
        details: `Question ${nextStatus} from quality manager.`
      });
      showToast({ tone: "success", title: nextStatus === "active" ? "Question active" : "Question hidden" });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Question update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Question quality</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Question review console</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Review bounded question samples, attempt-derived answer signals, missing explanations, and reported content.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<FileQuestion className="size-5" />} label="Loaded questions" value={String(rows.length)} helper="Recent admin sample" />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Review needed" value={String(reviewNeeded)} helper="Signals present" />
        <StatCard label="Reported" value={String(reported)} helper="User report sample" />
        <StatCard label="No explanation" value={String(missingExplanations)} helper="Trust gap" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search question, quiz, category" value={query} />
          </label>
          <Select onChange={(event) => setSignal(event.target.value)} value={signal}>
            <option value="all">All signals</option>
            <option value="review">Review needed</option>
            <option value="reported">Reported</option>
            <option value="missing-explanation">Missing explanation</option>
            <option value="low-correct">Low correct rate</option>
          </Select>
          <Select onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}>
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Questions will appear after admins create them for quizzes."
        emptyTitle="No questions found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((row) => (
            <Card className="p-4" key={row.question.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={row.question.status}>{row.question.status}</StatusBadge>
                    <Badge>{titleCase(row.question.type)}</Badge>
                    <Badge>{row.timesAnswered} answers</Badge>
                    {row.signals.map((item) => (
                      <Badge className="border-warning/20 bg-warning/10 text-warning" key={item}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{row.question.questionText}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.quizTitle} • {row.categoryName} • {row.correctRate}% correct • {row.wrongRate}% wrong • {row.skippedRate}% skipped • {formatSeconds(row.averageTimeSeconds)} avg
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button href={`/admin/quizzes/${row.question.quizId}/questions`} size="sm" variant="secondary">
                    Edit
                  </Button>
                  <Button disabled={working} onClick={() => void toggleQuestion(row)} size="sm" variant={row.question.status === "active" ? "danger" : "secondary"}>
                    {row.question.status === "active" ? "Hide" : "Unhide"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
