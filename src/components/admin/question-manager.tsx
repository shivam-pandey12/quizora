"use client";

import { ArrowDown, ArrowUp, EyeOff, FileQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { ImageDisplay } from "@/components/ui/image-display";
import { ImageUploadCard } from "@/components/ui/image-upload-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
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
import {
  adminMaxOptions,
  assertionReasonOptions,
  getDefaultQuestionByType,
  getQuestionTypeLabel,
  optionQuestionTypes,
  permanentQuestionTypes,
  trueFalseOptions
} from "@/lib/quiz/question-engine";
import { uploadImage } from "@/lib/uploads/images";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { Question, QuestionInput, QuestionOption, QuestionType, Quiz } from "@/types/domain";

const questionTypes: QuestionType[] = permanentQuestionTypes;

function option(text = ""): QuestionOption {
  return { id: crypto.randomUUID(), text, imageUrl: "", imagePath: "", imageAlt: "" };
}

function emptyQuestion(quizId: string, order: number): QuestionInput {
  return { ...getDefaultQuestionByType({ quizId, order }), points: 10, timeLimitSeconds: 0 };
}

export function QuestionManager({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionInput>(() => emptyQuestion(quizId, 1));
  const [editing, setEditing] = useState<Question | null>(null);
  const [pendingQuestionFile, setPendingQuestionFile] = useState<File | null>(null);
  const [pendingOptionFiles, setPendingOptionFiles] = useState<Record<string, File | null>>({});
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
    setPendingQuestionFile(null);
    setPendingOptionFiles({});
    setFieldErrors({});
    setForm(emptyQuestion(quizId, questions.length + 1));
  }

  function setType(type: QuestionType) {
    setFieldErrors({});
    setForm((current) => {
      const defaults = getDefaultQuestionByType({ quizId, order: current.order, type });
      const options =
        type === "true-false"
          ? trueFalseOptions()
          : type === "assertion-reason"
            ? assertionReasonOptions()
            : optionQuestionTypes.includes(type) || type === "multiple-choice"
              ? current.options.length >= 2
                ? current.options.slice(0, adminMaxOptions)
                : defaults.options
              : [];
      return {
        ...current,
        ...defaults,
        questionText: current.questionText,
        explanation: current.explanation,
        imageUrl: current.imageUrl,
        imagePath: current.imagePath,
        imageAlt: current.imageAlt,
        imageCaption: current.imageCaption,
        points: current.points,
        timeLimitSeconds: current.timeLimitSeconds,
        order: current.order,
        type,
        options,
        correctAnswer: type === "true-false" ? "true" : "",
        correctAnswers: [],
        correctOptionId: type === "true-false" ? "true" : "",
        correctOptionIds: []
      };
    });
  }

  function editQuestion(question: Question) {
    setEditing(question);
    setPendingQuestionFile(null);
    setPendingOptionFiles({});
    setFieldErrors({});
    setForm({
      quizId: question.quizId,
      type: question.type,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      correctOptionId: question.correctOptionId ?? question.correctAnswer,
      correctOptionIds: question.correctOptionIds ?? question.correctAnswers,
      correctText: question.correctText ?? "",
      acceptableAnswers: question.acceptableAnswers ?? [],
      caseSensitive: question.caseSensitive ?? false,
      trimWhitespace: question.trimWhitespace ?? true,
      correctNumber: question.correctNumber ?? null,
      tolerance: question.tolerance ?? 0,
      unit: question.unit ?? "",
      allowEquivalentUnits: question.allowEquivalentUnits ?? false,
      blanks: question.blanks ?? [],
      blankScoring: question.blankScoring ?? "all-or-nothing",
      matchPairs: question.matchPairs ?? [],
      shuffleRight: question.shuffleRight ?? true,
      orderItems: question.orderItems ?? [],
      correctOrderIds: question.correctOrderIds ?? [],
      assertionText: question.assertionText ?? "",
      reasonText: question.reasonText ?? "",
      passageTitle: question.passageTitle ?? "",
      passageText: question.passageText ?? "",
      passageImageUrl: question.passageImageUrl ?? "",
      passageImageAlt: question.passageImageAlt ?? "",
      explanation: question.explanation,
      imageUrl: question.imageUrl,
      imagePath: question.imagePath ?? "",
      imageAlt: question.imageAlt ?? "",
      imageCaption: question.imageCaption ?? "",
      points: question.points,
      timeLimitSeconds: question.timeLimitSeconds,
      order: question.order,
      status: question.status
    });
  }

  function updateOption(id: string, patch: Partial<QuestionOption>) {
    setForm((current) => ({
      ...current,
      options: current.options.map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));
  }

  function removeOption(id: string) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((item) => item.id !== id),
      correctAnswer: current.correctAnswer === id ? "" : current.correctAnswer,
      correctAnswers: current.correctAnswers.filter((answerId) => answerId !== id),
      correctOptionId: current.correctOptionId === id ? "" : current.correctOptionId,
      correctOptionIds: current.correctOptionIds?.filter((answerId) => answerId !== id) ?? []
    }));
  }

  function toggleCorrectAnswer(id: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      correctAnswers: checked
        ? Array.from(new Set([...current.correctAnswers, id]))
        : current.correctAnswers.filter((answerId) => answerId !== id),
      correctOptionIds: checked
        ? Array.from(new Set([...(current.correctOptionIds ?? current.correctAnswers), id]))
        : (current.correctOptionIds ?? current.correctAnswers).filter((answerId) => answerId !== id)
    }));
  }

  function moveOption(id: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.options.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.options.length) return current;
      const next = [...current.options];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, options: next };
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = {
      ...form,
      options: form.options.filter((item) => item.text.trim() || item.imageUrl?.trim()),
      correctOptionId: form.correctOptionId || form.correctAnswer,
      correctOptionIds: form.correctOptionIds?.length ? form.correctOptionIds : form.correctAnswers,
      correctAnswers: form.type === "multiple-choice" ? (form.correctOptionIds?.length ? form.correctOptionIds : form.correctAnswers) : [],
      correctAnswer:
        form.type === "multiple-choice" ? "" : form.correctOptionId || form.correctAnswer || form.correctText || ""
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
        const questionId = await createQuestion(normalized);
        let imageWarning = "";
        if (pendingQuestionFile && user) {
          try {
            await uploadImage({
              user,
              file: pendingQuestionFile,
              target: { kind: "question-image", quizId, questionId },
              alt: normalized.imageAlt ?? "",
              caption: normalized.imageCaption ?? ""
            });
          } catch (caught) {
            imageWarning = caught instanceof Error ? caught.message : "Question image upload failed.";
          }
        }
        const optionUploads = Object.entries(pendingOptionFiles).filter(
          (entry): entry is [string, File] => Boolean(entry[1]) && normalized.options.some((option) => option.id === entry[0])
        );
        for (const [optionId, file] of optionUploads) {
          if (!user) break;
          try {
            await uploadImage({
              user,
              file,
              target: { kind: "option-image", quizId, questionId, optionId },
              alt: normalized.options.find((option) => option.id === optionId)?.imageAlt ?? ""
            });
          } catch (caught) {
            imageWarning = caught instanceof Error ? caught.message : "One option image upload failed.";
          }
        }
        showToast({
          tone: imageWarning ? "info" : "success",
          title: "Question created",
          description: imageWarning ? `Question saved, but an image upload failed: ${imageWarning}` : undefined
        });
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

  const usesOptions =
    form.type === "true-false" ||
    form.type === "multiple-choice" ||
    optionQuestionTypes.includes(form.type);
  const canEditOptions = form.type !== "true-false" && form.type !== "assertion-reason";

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
                    {getQuestionTypeLabel(type)}
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
          <ImageUploadCard
            caption
            description="Optional diagram, map, graph, or visual prompt for this question."
            disabled={saving}
            metadata={{
              imageUrl: form.imageUrl,
              imagePath: form.imagePath ?? "",
              imageAlt: form.imageAlt ?? "",
              imageCaption: form.imageCaption ?? ""
            }}
            onChange={(metadata) =>
              setForm((current) => ({
                ...current,
                imageUrl: metadata.imageUrl,
                imagePath: metadata.imagePath,
                imageAlt: metadata.imageAlt,
                imageCaption: metadata.imageCaption ?? ""
              }))
            }
            onPendingFileChange={!editing ? setPendingQuestionFile : undefined}
            pendingFile={pendingQuestionFile}
            target={editing ? { kind: "question-image", quizId, questionId: editing.id } : undefined}
            title="Question image"
          />

          {usesOptions ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Options</p>
                {canEditOptions ? (
                  <Button
                    disabled={saving || form.options.length >= adminMaxOptions}
                    onClick={() => setForm((current) => ({ ...current, options: [...current.options, option()] }))}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Add option
                  </Button>
                ) : null}
              </div>
              {form.options.map((item, index) => (
                <div className="grid gap-2 rounded-2xl border border-border bg-surface/65 p-3" key={item.id}>
                  <div className="flex gap-2">
                    <Input
                      disabled={saving || !canEditOptions}
                      onChange={(event) => updateOption(item.id, { text: event.target.value })}
                      placeholder="Answer option"
                      value={item.text}
                    />
                    {canEditOptions ? (
                      <Button
                        disabled={index === 0}
                        onClick={() => moveOption(item.id, -1)}
                        type="button"
                        variant="ghost"
                      >
                        Up
                      </Button>
                    ) : null}
                    {canEditOptions ? (
                      <Button
                        disabled={index === form.options.length - 1}
                        onClick={() => moveOption(item.id, 1)}
                        type="button"
                        variant="ghost"
                      >
                        Down
                      </Button>
                    ) : null}
                    {canEditOptions ? (
                      <Button
                        disabled={form.options.length <= 2}
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
                        checked={(form.correctOptionId || form.correctAnswer) === item.id}
                        name="correctAnswer"
                        onChange={() => setForm((current) => ({ ...current, correctAnswer: item.id, correctOptionId: item.id }))}
                        type="radio"
                      />
                      Correct answer
                    </label>
                  )}
                  {canEditOptions ? (
                    <ImageUploadCard
                      compact
                      description="Optional visual answer option."
                      disabled={saving}
                      metadata={{
                        imageUrl: item.imageUrl ?? "",
                        imagePath: item.imagePath ?? "",
                        imageAlt: item.imageAlt ?? ""
                      }}
                      onChange={(metadata) =>
                        updateOption(item.id, {
                          imageUrl: metadata.imageUrl,
                          imagePath: metadata.imagePath,
                          imageAlt: metadata.imageAlt
                        })
                      }
                      onPendingFileChange={!editing ? (file) => setPendingOptionFiles((current) => ({ ...current, [item.id]: file })) : undefined}
                      pendingFile={pendingOptionFiles[item.id] ?? null}
                      target={
                        editing
                          ? {
                              kind: "option-image",
                              quizId,
                              questionId: editing.id,
                              optionId: item.id
                            }
                          : undefined
                      }
                      title={`Option ${item.text || item.id} image`}
                    />
                  ) : null}
                </div>
              ))}
              <FieldError message={fieldErrors.options} />
              <FieldError message={fieldErrors.correctAnswer} />
              <FieldError message={fieldErrors.correctAnswers} />
            </div>
          ) : null}

          {form.type === "short-answer" || form.type === "text" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Accepted answer
                <Input
                  disabled={saving}
                  onChange={(event) => setForm((current) => ({ ...current, correctAnswer: event.target.value, correctText: event.target.value }))}
                  placeholder="Example: photosynthesis"
                  value={form.correctText || form.correctAnswer}
                />
                <FieldError message={fieldErrors.correctText} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Alternate accepted answers
                <Input
                  disabled={saving}
                  onChange={(event) => setForm((current) => ({ ...current, acceptableAnswers: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="Comma separated"
                  value={(form.acceptableAnswers ?? []).join(", ")}
                />
              </label>
            </div>
          ) : null}

          {form.type === "numeric" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Correct number
                <Input
                  disabled={saving}
                  onChange={(event) => setForm((current) => ({ ...current, correctNumber: Number(event.target.value) }))}
                  type="number"
                  value={form.correctNumber ?? ""}
                />
                <FieldError message={fieldErrors.correctNumber} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Tolerance
                <Input
                  disabled={saving}
                  min={0}
                  onChange={(event) => setForm((current) => ({ ...current, tolerance: Number(event.target.value) }))}
                  type="number"
                  value={form.tolerance ?? 0}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Unit label
                <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} value={form.unit ?? ""} />
              </label>
            </div>
          ) : null}

          {form.type === "fill-blank" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Blanks</p>
                <Button onClick={() => setForm((current) => ({ ...current, blanks: [...(current.blanks ?? []), { id: crypto.randomUUID(), label: `Blank ${(current.blanks ?? []).length + 1}`, acceptableAnswers: [], caseSensitive: false }] }))} size="sm" type="button" variant="secondary">Add blank</Button>
              </div>
              {(form.blanks ?? []).map((blank, index) => (
                <div className="grid gap-2 rounded-2xl border border-border bg-surface/65 p-3 md:grid-cols-[1fr_2fr_auto]" key={blank.id}>
                  <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, blanks: (current.blanks ?? []).map((item) => item.id === blank.id ? { ...item, label: event.target.value } : item) }))} value={blank.label} />
                  <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, blanks: (current.blanks ?? []).map((item) => item.id === blank.id ? { ...item, acceptableAnswers: event.target.value.split(",").map((answer) => answer.trim()).filter(Boolean) } : item) }))} placeholder="Accepted answers, comma separated" value={blank.acceptableAnswers.join(", ")} />
                  <Button disabled={saving || (form.blanks ?? []).length <= 1} onClick={() => setForm((current) => ({ ...current, blanks: (current.blanks ?? []).filter((item) => item.id !== blank.id) }))} type="button" variant="ghost">Remove {index + 1}</Button>
                </div>
              ))}
              <FieldError message={fieldErrors.blanks} />
            </div>
          ) : null}

          {form.type === "matching" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Matching pairs</p>
                <Button onClick={() => setForm((current) => ({ ...current, matchPairs: [...(current.matchPairs ?? []), { id: crypto.randomUUID(), left: "", right: "" }] }))} size="sm" type="button" variant="secondary">Add pair</Button>
              </div>
              {(form.matchPairs ?? []).map((pair) => (
                <div className="grid gap-2 rounded-2xl border border-border bg-surface/65 p-3 md:grid-cols-[1fr_1fr_auto]" key={pair.id}>
                  <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, matchPairs: (current.matchPairs ?? []).map((item) => item.id === pair.id ? { ...item, left: event.target.value } : item) }))} placeholder="Left item" value={pair.left} />
                  <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, matchPairs: (current.matchPairs ?? []).map((item) => item.id === pair.id ? { ...item, right: event.target.value } : item) }))} placeholder="Right match" value={pair.right} />
                  <Button disabled={saving || (form.matchPairs ?? []).length <= 2} onClick={() => setForm((current) => ({ ...current, matchPairs: (current.matchPairs ?? []).filter((item) => item.id !== pair.id) }))} type="button" variant="ghost">Remove</Button>
                </div>
              ))}
              <FieldError message={fieldErrors.matchPairs} />
            </div>
          ) : null}

          {form.type === "ordering" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Correct order</p>
                <Button onClick={() => setForm((current) => ({ ...current, orderItems: [...(current.orderItems ?? []), { id: crypto.randomUUID(), text: "" }] }))} size="sm" type="button" variant="secondary">Add item</Button>
              </div>
              {(form.orderItems ?? []).map((item, index) => (
                <div className="flex gap-2 rounded-2xl border border-border bg-surface/65 p-3" key={item.id}>
                  <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, orderItems: (current.orderItems ?? []).map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry), correctOrderIds: (current.orderItems ?? []).map((entry) => entry.id) }))} placeholder={`Item ${index + 1}`} value={item.text} />
                  <Button disabled={saving || index === 0} onClick={() => setForm((current) => {
                    const next = [...(current.orderItems ?? [])];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    return { ...current, orderItems: next, correctOrderIds: next.map((entry) => entry.id) };
                  })} type="button" variant="ghost">Up</Button>
                  <Button disabled={saving || index === (form.orderItems ?? []).length - 1} onClick={() => setForm((current) => {
                    const next = [...(current.orderItems ?? [])];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    return { ...current, orderItems: next, correctOrderIds: next.map((entry) => entry.id) };
                  })} type="button" variant="ghost">Down</Button>
                </div>
              ))}
              <FieldError message={fieldErrors.orderItems} />
            </div>
          ) : null}

          {form.type === "assertion-reason" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Assertion
                <Textarea disabled={saving} onChange={(event) => setForm((current) => ({ ...current, assertionText: event.target.value }))} value={form.assertionText ?? ""} />
                <FieldError message={fieldErrors.assertionText} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Reason
                <Textarea disabled={saving} onChange={(event) => setForm((current) => ({ ...current, reasonText: event.target.value }))} value={form.reasonText ?? ""} />
                <FieldError message={fieldErrors.reasonText} />
              </label>
            </div>
          ) : null}

          {form.type === "passage" ? (
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold">
                Passage title
                <Input disabled={saving} onChange={(event) => setForm((current) => ({ ...current, passageTitle: event.target.value }))} value={form.passageTitle ?? ""} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Passage text
                <Textarea disabled={saving} onChange={(event) => setForm((current) => ({ ...current, passageText: event.target.value }))} value={form.passageText ?? ""} />
                <FieldError message={fieldErrors.passageText} />
              </label>
            </div>
          ) : null}

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
                  {question.imageUrl ? (
                    <ImageDisplay
                      alt={question.imageAlt || question.questionText}
                      caption={question.imageCaption}
                      className="mt-4 max-w-2xl"
                      imageClassName="max-h-72"
                      src={question.imageUrl}
                    />
                  ) : null}
                  {question.options.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {question.options.map((item) => {
                        const isCorrect =
                          question.correctAnswer === item.id ||
                          question.correctOptionId === item.id ||
                          question.correctAnswers.includes(item.id) ||
                          (question.correctOptionIds ?? []).includes(item.id);
                        return (
                          <div
                            className="rounded-2xl border border-border bg-surface/70 p-3 text-sm"
                            key={item.id}
                          >
                            {item.imageUrl ? (
                              <ImageDisplay
                                alt={item.imageAlt || item.text}
                                className="mb-3 rounded-2xl"
                                compact
                                imageClassName="max-h-36"
                                src={item.imageUrl}
                              />
                            ) : null}
                            <span>{item.text || item.imageAlt || item.id}</span>
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
