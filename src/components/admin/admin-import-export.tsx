"use client";

import { Download, Import, Upload } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  importCategoryDraft,
  importQuizDraft
} from "@/lib/firestore/admin-content-controls";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import { listRecentAdminAttempts } from "@/lib/firestore/attempts";
import { listAdminCategories, listAdminQuizzes, listQuestionsForQuiz } from "@/lib/firestore/content";
import { listAdminFeedback } from "@/lib/firestore/feedback";
import { listAdminReports } from "@/lib/firestore/reports";
import type { CategoryInput, QuestionInput, QuizInput } from "@/types/domain";

type ExportKind = "quizzes" | "categories" | "questions" | "attempts" | "reports" | "feedback";
type ImportKind = "category" | "quiz";

function downloadFile(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function AdminImportExport() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [exportKind, setExportKind] = useState<ExportKind>("quizzes");
  const [importKind, setImportKind] = useState<ImportKind>("quiz");
  const [jsonText, setJsonText] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  async function runExport() {
    if (!isFirebaseConfigured) {
      showToast({ tone: "error", title: "Firebase setup required", description: firebaseSetupMessage });
      return;
    }

    setWorking(true);
    try {
      if (exportKind === "quizzes") {
        const data = await listAdminQuizzes();
        downloadFile("quizora-quizzes.json", JSON.stringify(data, null, 2));
      }
      if (exportKind === "categories") {
        const data = await listAdminCategories();
        downloadFile("quizora-categories.json", JSON.stringify(data, null, 2));
      }
      if (exportKind === "questions") {
        const quizzes = await listAdminQuizzes();
        const payload = [];
        for (const quiz of quizzes.slice(0, 30)) {
          payload.push({ quiz, questions: await listQuestionsForQuiz(quiz.id) });
        }
        downloadFile("quizora-questions-by-quiz.json", JSON.stringify(payload, null, 2));
      }
      if (exportKind === "attempts") {
        const data = await listRecentAdminAttempts(200);
        const rows = [
          ["id", "user", "quiz", "mode", "score", "totalPoints", "accuracy", "completedAt"],
          ...data.map((attempt) => [
            attempt.id,
            attempt.userDisplayName,
            attempt.quizTitle,
            attempt.mode,
            attempt.score,
            attempt.totalPoints,
            attempt.accuracy,
            attempt.completedAt
          ])
        ];
        downloadFile("quizora-attempts.csv", rows.map((row) => row.map(csvEscape).join(",")).join("\n"), "text/csv");
      }
      if (exportKind === "reports") {
        const data = await listAdminReports({ count: 200 });
        downloadFile("quizora-reports.json", JSON.stringify(data, null, 2));
      }
      if (exportKind === "feedback") {
        const data = await listAdminFeedback({ count: 200 });
        downloadFile("quizora-feedback.json", JSON.stringify(data, null, 2));
      }
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "data_exported",
        targetType: "export",
        targetId: exportKind,
        targetLabel: exportKind,
        details: `Exported ${exportKind}.`
      });
      showToast({ tone: "success", title: "Export ready" });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Export failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  function previewLabel() {
    try {
      const parsed = JSON.parse(jsonText);
      if (importKind === "category") return parsed.name ? `Category: ${parsed.name}` : "Category JSON";
      return parsed.quiz?.title || parsed.title ? `Quiz draft: ${parsed.quiz?.title ?? parsed.title}` : "Quiz JSON";
    } catch {
      return "Paste valid JSON to preview.";
    }
  }

  async function runImport() {
    setWorking(true);
    try {
      const parsed = JSON.parse(jsonText);
      if (importKind === "category") {
        await importCategoryDraft(parsed as CategoryInput);
      } else {
        const quiz = (parsed.quiz ?? parsed) as QuizInput;
        const questions = Array.isArray(parsed.questions) ? (parsed.questions as QuestionInput[]) : [];
        await importQuizDraft(quiz, questions);
      }
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "data_imported",
        targetType: "import",
        targetId: importKind,
        targetLabel: previewLabel(),
        details: "Preview-confirmed import created draft/hidden content only."
      });
      showToast({ tone: "success", title: "Import complete", description: "Imported content was kept draft/hidden by default." });
      setJsonText("");
      setConfirmImport(false);
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Import failed",
        description: caught instanceof Error ? caught.message : "Check the JSON shape and try again."
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Import/export</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Data tools</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Export bounded operational data and import draft content with a preview-first flow. No published content is overwritten automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader className="mb-4" title="Export" />
          <div className="grid gap-4">
            <Select onChange={(event) => setExportKind(event.target.value as ExportKind)} value={exportKind}>
              <option value="quizzes">Quizzes JSON</option>
              <option value="categories">Categories JSON</option>
              <option value="questions">Questions by quiz JSON</option>
              <option value="attempts">Attempt summary CSV</option>
              <option value="reports">Reports JSON</option>
              <option value="feedback">Feedback JSON</option>
            </Select>
            <Button disabled={working} icon={<Download className="size-4" />} onClick={() => void runExport()}>
              Export
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader className="mb-4" title="Import draft content" />
          <div className="grid gap-4">
            <Select onChange={(event) => setImportKind(event.target.value as ImportKind)} value={importKind}>
              <option value="quiz">Quiz draft JSON</option>
              <option value="category">Hidden category JSON</option>
            </Select>
            <Textarea onChange={(event) => setJsonText(event.target.value)} placeholder="Paste JSON here" value={jsonText} />
            <div className="rounded-3xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
              {previewLabel()}
            </div>
            <Button disabled={working || !jsonText.trim()} icon={<Upload className="size-4" />} onClick={() => setConfirmImport(true)} variant="secondary">
              Preview and import
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex gap-3">
          <Import className="mt-1 size-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            Large imports should move to a trusted backend or scripted migration. This Phase 11 tool is intentionally conservative and creates draft/hidden content only.
          </p>
        </div>
      </Card>

      <ConfirmDialog
        confirmLabel="Import draft"
        description={`${previewLabel()} will be created as draft/hidden content. Existing published content will not be overwritten.`}
        loading={working}
        onCancel={() => setConfirmImport(false)}
        onConfirm={() => void runImport()}
        open={confirmImport}
        title="Import this JSON?"
      />
    </div>
  );
}
