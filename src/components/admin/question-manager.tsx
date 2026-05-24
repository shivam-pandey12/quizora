"use client";

import { ArrowDown, ArrowUp, EyeOff, FileQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createQuestion,
  deleteQuestion,
  getAdminQuiz,
  listQuestionsForQuiz,
  reorderQuestions,
  setQuestionStatus,
  updateQuestion
} from "@/lib/firestore/content";
import { validateQuestionInput } from "@/lib/firestore/validation";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { Question, QuestionInput, QuestionOption, QuestionType, Quiz } from "@/types/domain";

const questionTypes: QuestionType[] = ["single-choice", "multiple-choice", "true-false", "text"];

function option(text = ""): QuestionOption {
  return { id: crypto.randomUUID(), text };
}

function trueFalseOptions(): QuestionOption[] {
  return [
    { id: "true", text: "True" },
    { id: "false", text: "False" }
  ];
}

function emptyQuestion(quizId: string, order: number): QuestionInput {
  return {
    quizId,
    type: "single-choice",
    questionText: "",
    options: [option(), option()],
    correctAnswer: "",
    correctAnswers: [],
    explanation: "",
    imageUrl: "",
    points: 10,
    timeLimitSeconds: 0,
    order,
    status: "active"
  };
}

export function QuestionManager({ quizId }: { quizId: string }) {
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionInput>(() => emptyQuestion(quizId, 1));
  const [editing, setEditing] = useState<Question | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const loadData = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError(firebaseSetupMessage);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextQuiz, nextQuestions] = await Promise.all([
        getAdminQuiz(quizId),
        listQuestionsForQuiz(quizId)
      ]);
      setQuiz(nextQuiz);
      setQuestions(nextQuestions);
      setForm((current) => ({ ...current, order: nextQuestions.length + 1 }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load questions.");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeQuestions = useMemo(
    () => questions.filter((question) => question.status === "active"),
    [questions]
  );

  function resetForm() {
    setEditing(null);
    setFieldErrors({});
    setForm(emptyQuestion(quizId, questions.length + 1));
  }

  function setType(type: QuestionType) {
    setFieldErrors({});
    setForm((current) => {
      if (type === "true-false") {
        return {
          ...current,
          type,
          options: trueFalseOptions(),
          correctAnswer: "true",
          correctAnswers: []
        };
      }
      if (type === "text") {
        return {
          ...current,
          type,
          options: [],
          correctAnswer: "",
          correctAnswers: []
        };
      }
      const options = current.options.length >= 2 ? current.options : [option(), option()];
      return {
        ...current,
        type,
        options,
        correctAnswer: type === "single-choice" ? current.correctAnswer : "",
        correctAnswers: type === "multiple-choice" ? current.correctAnswers : []
      };
    });
  }

  function editQuestion(question: Question) {
    setEditing(question);
    setFieldErrors({});
    setForm({
      quizId: question.quizId,
      type: question.type,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
      imageUrl: question.imageUrl,
      points: question.points,
      timeLimitSeconds: question.timeLimitSeconds,
      order: question.order,
      status: question.status
    });
  }

  function updateOption(id: string, text: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((item) => (item.id === id ? { ...item, text } : item))
    }));
  }

  function removeOption(id: string) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((item) => item.id !== id),
      correctAnswer: current.correctAnswer === id ? "" : current.correctAnswer,
      correctAnswers: current.correctAnswers.filter((answerId) => answerId !== id)
    }));
  }

  function toggleCorrectAnswer(id: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      correctAnswers: checked
        ? Array.from(new Set([...current.correctAnswers, id]))
        : current.correctAnswers.filter((answerId) => answerId !== id)
    }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = {
      ...form,
      options: form.options.filter((item) => item.text.trim()),
      correctAnswers: form.type === "multiple-choice" ? form.correctAnswers : [],
      correctAnswer:
        form.type === "single-choice" || form.type === "true-false" ? form.correctAnswer : form.correctAnswer
    };
    const validation = validateQuestionInput(normalized);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    try {
      if (editing) {
        await updateQuestion(editing.id, normalized);
        showToast({ tone: "success", title: "Question updated" });
      } else {
        await createQuestion(normalized);
        showToast({ tone: "success", title: "Question created" });
      }
      resetForm();
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Question save failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const next = [...questions];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setQuestions(next.map((question, orderIndex) => ({ ...question, order: orderIndex + 1 })));
    try {
      await reorderQuestions(quizId, next.map((question) => question.id));
      showToast({ tone: "success", title: "Question order updated" });
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Reorder failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    }
  }

  async function toggleQuestionStatus(question: Question) {
    const nextStatus = question.status === "active" ? "hidden" : "active";
    try {
      await setQuestionStatus(question.id, quizId, nextStatus);
      showToast({ tone: "success", title: nextStatus === "active" ? "Question active" : "Question hidden" });
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Status update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteQuestion(deleteTarget.id, quizId);
      showToast({ tone: "success", title: "Question deleted" });
      setDeleteTarget(null);
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Delete failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Question manager</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold">
            {quiz?.title ?? "Quiz questions"}
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Store clean question data for gameplay. Correct answers are visible here and in saved result reviews, never on public quiz detail pages.
          </p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={resetForm} variant="secondary">
          New question
        </Button>
      </div>

      <Card className="p-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-sm text-muted-foreground">Active questions</p>
            <p className="mt-1 text-2xl font-semibold">{activeQuestions.length}</p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-sm text-muted-foreground">Total points</p>
            <p className="mt-1 text-2xl font-semibold">
              {activeQuestions.reduce((sum, question) => sum + question.points, 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-sm text-muted-foreground">Quiz status</p>
            <p className="mt-1 text-2xl font-semibold">{quiz ? titleCase(quiz.status) : "Loading"}</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={submitForm}>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 text-sm font-semibold">
              Type
              <Select
                disabled={saving}
                onChange={(event) => setType(event.target.value as QuestionType)}
                value={form.type}
              >
                {questionTypes.map((type) => (
                  <option key={type} value={type}>
                    {titleCase(type)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Points
              <Input
                disabled={saving}
                min={1}
                onChange={(event) => setForm((current) => ({ ...current, points: Number(event.target.value) }))}
                type="number"
                value={form.points}
              />
              <FieldError message={fieldErrors.points} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Time limit seconds
              <Input
                disabled={saving}
                min={0}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timeLimitSeconds: Number(event.target.value) }))
                }
                type="number"
                value={form.timeLimitSeconds}
              />
              <FieldError message={fieldErrors.timeLimitSeconds} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Status
              <Select
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as QuestionInput["status"]
                  }))
                }
                value={form.status}
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </Select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Question text
            <Textarea
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, questionText: event.target.value }))}
              placeholder="Which signal best describes..."
              value={form.questionText}
            />
            <FieldError message={fieldErrors.questionText} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Image URL
            <Input
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
              placeholder="Optional image URL"
              value={form.imageUrl}
            />
          </label>

          {form.type !== "text" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Options</p>
                {form.type !== "true-false" ? (
                  <Button
                    onClick={() => setForm((current) => ({ ...current, options: [...current.options, option()] }))}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Add option
                  </Button>
                ) : null}
              </div>
              {form.options.map((item) => (
                <div className="grid gap-2 rounded-2xl border border-border bg-surface/65 p-3" key={item.id}>
                  <div className="flex gap-2">
                    <Input
                      disabled={saving || form.type === "true-false"}
                      onChange={(event) => updateOption(item.id, event.target.value)}
                      placeholder="Answer option"
                      value={item.text}
                    />
                    {form.type !== "true-false" ? (
                      <Button
                        onClick={() => removeOption(item.id)}
                        type="button"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {form.type === "multiple-choice" ? (
                    <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <input
                        checked={form.correctAnswers.includes(item.id)}
                        onChange={(event) => toggleCorrectAnswer(item.id, event.target.checked)}
                        type="checkbox"
                      />
                      Correct answer
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <input
                        checked={form.correctAnswer === item.id}
                        name="correctAnswer"
                        onChange={() => setForm((current) => ({ ...current, correctAnswer: item.id }))}
                        type="radio"
                      />
                      Correct answer
                    </label>
                  )}
                </div>
              ))}
              <FieldError message={fieldErrors.options} />
              <FieldError message={fieldErrors.correctAnswer} />
              <FieldError message={fieldErrors.correctAnswers} />
            </div>
          ) : (
            <label className="grid gap-2 text-sm font-semibold">
              Text answer placeholder
              <Input
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, correctAnswer: event.target.value }))}
                placeholder="Stored for admin review; text scoring remains intentionally conservative."
                value={form.correctAnswer}
              />
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold">
            Explanation
            <Textarea
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
              placeholder="Explain why the answer is correct."
              value={form.explanation}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : editing ? "Update question" : "Add question"}
            </Button>
            {editing ? (
              <Button disabled={saving} onClick={resetForm} type="button" variant="secondary">
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <AdminDataState
        empty={questions.length === 0}
        emptyDescription="Add at least one active question before publishing the quiz."
        emptyTitle="No questions yet"
        error={error}
        icon={FileQuestion}
        loading={loading}
      />

      {!loading && !error && questions.length ? (
        <div className="grid gap-4">
          {questions.map((question, index) => (
            <Card className="p-5" key={question.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={question.status} />
                    <StatusBadge value={question.type}>{titleCase(question.type)}</StatusBadge>
                    <StatusBadge value="featured">#{question.order}</StatusBadge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{question.questionText}</h2>
                  {question.options.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {question.options.map((item) => {
                        const isCorrect =
                          question.correctAnswer === item.id ||
                          question.correctAnswers.includes(item.id);
                        return (
                          <div
                            className="rounded-2xl border border-border bg-surface/70 p-3 text-sm"
                            key={item.id}
                          >
                            <span>{item.text}</span>
                            {isCorrect ? (
                              <StatusBadge className="ml-2" value="active">
                                Answer
                              </StatusBadge>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {question.explanation ? (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {question.explanation}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                    <span>{question.points} points</span>
                    <span>{formatSeconds(question.timeLimitSeconds)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={index === 0}
                    icon={<ArrowUp className="size-4" />}
                    onClick={() => void moveQuestion(index, -1)}
                    size="sm"
                    variant="secondary"
                  >
                    Up
                  </Button>
                  <Button
                    disabled={index === questions.length - 1}
                    icon={<ArrowDown className="size-4" />}
                    onClick={() => void moveQuestion(index, 1)}
                    size="sm"
                    variant="secondary"
                  >
                    Down
                  </Button>
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => editQuestion(question)}
                    size="sm"
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  <Button
                    icon={<EyeOff className="size-4" />}
                    onClick={() => void toggleQuestionStatus(question)}
                    size="sm"
                    variant="secondary"
                  >
                    {question.status === "active" ? "Hide" : "Unhide"}
                  </Button>
                  <Button
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setDeleteTarget(question)}
                    size="sm"
                    variant="danger"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete question"
        description="This removes the question and recalculates the quiz question count and total points."
        loading={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        open={Boolean(deleteTarget)}
        title="Delete this question?"
      />
    </div>
  );
}
