"use client";

import {
  Archive,
  AlertTriangle,
  FileQuestion,
  Pencil,
  Plus,
  Search,
  Send,
  XCircle
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  archiveQuiz,
  createQuiz,
  listAdminCategories,
  listAdminQuizzes,
  publishQuiz,
  setQuizStatus,
  updateQuiz
} from "@/lib/firestore/content";
import { createSlug } from "@/lib/firestore/slug";
import { formatDate } from "@/lib/firestore/timestamps";
import { validateQuizInput } from "@/lib/firestore/validation";
import { uploadImage } from "@/lib/uploads/images";
import { titleCase } from "@/lib/utils";
import type { Category, Quiz, QuizDifficulty, QuizInput, QuizStatus } from "@/types/domain";

const difficulties: QuizDifficulty[] = ["easy", "medium", "hard", "expert"];

function getEmptyQuiz(createdBy = ""): QuizInput {
  return {
    title: "",
    slug: "",
    description: "",
    shortDescription: "",
    categoryId: "",
    categoryName: "",
    difficulty: "easy",
    status: "draft",
    visibility: "public",
    thumbnailUrl: "",
    coverImageUrl: "",
    coverImagePath: "",
    coverImageAlt: "",
    coverImageCaption: "",
    tags: [],
    estimatedMinutes: 8,
    timeLimitSeconds: 0,
    isFeatured: false,
    isDailyChallenge: false,
    createdBy,
    ownerId: createdBy,
    ownerName: "Quizora Studio",
    ownerType: "admin",
    publishScope: "global",
    reviewStatus: "approved",
    allowedClassIds: []
  };
}

export function QuizManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuizStatus>("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState<"all" | QuizDifficulty>("all");
  const [featured, setFeatured] = useState<"all" | "featured" | "daily">("all");
  const [sort, setSort] = useState("updated");
  const [form, setForm] = useState<QuizInput>(() => getEmptyQuiz(user?.uid));
  const [tagsValue, setTagsValue] = useState("");
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Quiz | null>(null);

  async function loadData() {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError(firebaseSetupMessage);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextQuizzes] = await Promise.all([
        listAdminCategories(),
        listAdminQuizzes()
      ]);
      setCategories(nextCategories);
      setQuizzes(nextQuizzes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load quizzes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      createdBy: current.createdBy || user?.uid || "",
      ownerId: current.ownerId || user?.uid || ""
    }));
  }, [user?.uid]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return quizzes
      .filter((quiz) => {
        const matchesQuery =
          !normalized ||
          quiz.title.toLowerCase().includes(normalized) ||
          quiz.description.toLowerCase().includes(normalized) ||
          quiz.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
          quiz.slug.toLowerCase().includes(normalized);
        const matchesStatus = status === "all" || quiz.status === status;
        const matchesCategory = category === "all" || quiz.categoryId === category;
        const matchesDifficulty = difficulty === "all" || quiz.difficulty === difficulty;
        const matchesFeatured =
          featured === "all" ||
          (featured === "featured" && quiz.isFeatured) ||
          (featured === "daily" && quiz.isDailyChallenge);
        return matchesQuery && matchesStatus && matchesCategory && matchesDifficulty && matchesFeatured;
      })
      .sort((first, second) => {
        if (sort === "title") return first.title.localeCompare(second.title);
        if (sort === "status") return first.status.localeCompare(second.status);
        return (second.updatedAt ?? "").localeCompare(first.updatedAt ?? "");
      });
  }, [category, difficulty, featured, query, quizzes, sort, status]);

  const publishingReadiness = useMemo(() => {
    if (!form.title.trim() && !editing) return [];

    const notes: string[] = [];
    const shortDescriptionLength = form.shortDescription.trim().length;
    const descriptionLength = form.description.trim().length;

    if (form.title.trim().length > 70) {
      notes.push("Shorten the title if possible. Search and social previews may cut off titles above 70 characters.");
    }
    if (form.slug.trim().length < 3) {
      notes.push("Add a stable slug for the public quiz URL, for example science-foundations.");
    }
    if (shortDescriptionLength > 0 && shortDescriptionLength < 50) {
      notes.push("Expand the short description to 50-150 clear characters before publishing.");
    }
    if (descriptionLength > 0 && descriptionLength < 120) {
      notes.push("Add more detail to the full description so players know what the quiz covers.");
    }
    if (!(form.coverImageUrl || form.thumbnailUrl).trim()) {
      notes.push("Optional: add a cover image for cards and social previews. If skipped, Quizora uses the generated visual theme.");
    }

    return notes;
  }, [editing, form.coverImageUrl, form.description, form.shortDescription, form.slug, form.thumbnailUrl, form.title]);

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : createSlug(title)
    }));
  }

  function updateCategory(categoryId: string) {
    const selected = categories.find((item) => item.id === categoryId);
    setForm((current) => ({
      ...current,
      categoryId,
      categoryName: selected?.name ?? ""
    }));
  }

  function resetForm() {
    setForm(getEmptyQuiz(user?.uid));
    setTagsValue("");
    setEditing(null);
    setPendingCoverFile(null);
    setSlugTouched(false);
    setFieldErrors({});
  }

  function editQuiz(quiz: Quiz) {
    setEditing(quiz);
    setPendingCoverFile(null);
    setSlugTouched(true);
    setFieldErrors({});
    setTagsValue(quiz.tags.join(", "));
    setForm({
      title: quiz.title,
      slug: quiz.slug,
      description: quiz.description,
      shortDescription: quiz.shortDescription,
      categoryId: quiz.categoryId,
      categoryName: quiz.categoryName,
      difficulty: quiz.difficulty,
      status: quiz.status,
      visibility: quiz.visibility,
      thumbnailUrl: quiz.thumbnailUrl,
      coverImageUrl: quiz.coverImageUrl ?? "",
      coverImagePath: quiz.coverImagePath ?? "",
      coverImageAlt: quiz.coverImageAlt ?? "",
      coverImageCaption: quiz.coverImageCaption ?? "",
      tags: quiz.tags,
      estimatedMinutes: quiz.estimatedMinutes,
      timeLimitSeconds: quiz.timeLimitSeconds,
      isFeatured: quiz.isFeatured,
      isDailyChallenge: quiz.isDailyChallenge,
      createdBy: quiz.createdBy || user?.uid || "",
      ownerId: quiz.ownerId || quiz.createdBy || user?.uid || "",
      ownerName: quiz.ownerName || "Quizora Studio",
      ownerType: quiz.ownerType || "admin",
      publishScope: quiz.publishScope || "global",
      reviewStatus: quiz.reviewStatus || "approved",
      allowedClassIds: quiz.allowedClassIds || []
    });
  }

  function normalizeForm(): QuizInput {
    return {
      ...form,
      tags: tagsValue
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    };
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeForm();
    if (normalized.status === "published" && editing?.status !== "published") {
      setFieldErrors({
        status: "Use the Publish button after adding active questions."
      });
      return;
    }
    const validation = validateQuizInput(normalized);
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    try {
      let savedId = editing?.id ?? "";
      let imageWarning = "";
      if (editing) {
        await updateQuiz(editing.id, normalized);
      } else {
        savedId = await createQuiz(normalized);
      }
      if (pendingCoverFile && user && savedId) {
        try {
          await uploadImage({
            user,
            file: pendingCoverFile,
            target: { kind: "quiz-cover", quizId: savedId },
            alt: normalized.coverImageAlt ?? "",
            caption: normalized.coverImageCaption ?? ""
          });
          setPendingCoverFile(null);
        } catch (caught) {
          imageWarning = caught instanceof Error ? caught.message : "Cover image upload failed.";
        }
      }
      showToast({
        tone: imageWarning ? "info" : "success",
        title: editing ? "Quiz updated" : "Quiz draft created",
        description: imageWarning ? `Quiz saved, but cover upload failed: ${imageWarning}` : undefined
      });
      resetForm();
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Quiz save failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>, successTitle: string) {
    setSaving(true);
    try {
      await action();
      showToast({ tone: "success", title: successTitle });
      await loadData();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Quiz action failed",
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
          <p className="text-sm font-semibold uppercase text-primary">Quiz manager</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold">Firestore quiz studio</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Create real quiz content, publish only valid quizzes, and keep questions ready for the live play engine.
          </p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={resetForm} variant="secondary">
          New quiz
        </Button>
      </div>

      <Card className="p-5">
        <form className="grid gap-4" onSubmit={submitForm}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Title
              <Input
                disabled={saving}
                onChange={(event) => updateTitle(event.target.value)}
                placeholder="Science Signal"
                value={form.title}
              />
              <FieldError message={fieldErrors.title} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Slug
              <Input
                disabled={saving}
                onChange={(event) => {
                  setSlugTouched(true);
                  setForm((current) => ({ ...current, slug: createSlug(event.target.value) }));
                }}
                placeholder="science-signal"
                value={form.slug}
              />
              <FieldError message={fieldErrors.slug} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Short description
            <Input
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({ ...current, shortDescription: event.target.value }))
              }
              placeholder="Concept-first science prompts for sharp recall."
              value={form.shortDescription}
            />
            <FieldError message={fieldErrors.shortDescription} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Full description
            <Textarea
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe the quiz experience, scope, and skill signal."
              value={form.description}
            />
            <FieldError message={fieldErrors.description} />
          </label>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 text-sm font-semibold">
              Category
              <Select
                disabled={saving}
                onChange={(event) => updateCategory(event.target.value)}
                value={form.categoryId}
              >
                <option value="">Choose category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.categoryId} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Difficulty
              <Select
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    difficulty: event.target.value as QuizDifficulty
                  }))
                }
                value={form.difficulty}
              >
                {difficulties.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Visibility
              <Select
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    visibility: event.target.value as QuizInput["visibility"]
                  }))
                }
                value={form.visibility}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Status
              <Select
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as QuizStatus
                  }))
                }
                value={form.status}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
              <FieldError message={fieldErrors.status} />
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageUploadCard
              caption
              description="Used on quiz cards, quiz detail, featured sections, and social previews."
              disabled={saving}
              metadata={{
                imageUrl: form.coverImageUrl || form.thumbnailUrl || "",
                imagePath: form.coverImagePath ?? "",
                imageAlt: form.coverImageAlt ?? "",
                imageCaption: form.coverImageCaption ?? ""
              }}
              onChange={(metadata) =>
                setForm((current) => ({
                  ...current,
                  coverImageUrl: metadata.imageUrl,
                  coverImagePath: metadata.imagePath,
                  coverImageAlt: metadata.imageAlt,
                  coverImageCaption: metadata.imageCaption ?? "",
                  thumbnailUrl: metadata.imageUrl
                    ? metadata.imageUrl
                    : current.thumbnailUrl === current.coverImageUrl
                      ? ""
                      : current.thumbnailUrl
                  }))
                }
              onPendingFileChange={!editing ? setPendingCoverFile : undefined}
              pendingFile={pendingCoverFile}
              target={editing ? { kind: "quiz-cover", quizId: editing.id } : undefined}
              title="Quiz cover image"
            />
            <label className="grid content-start gap-2 text-sm font-semibold">
              Fallback thumbnail URL
              <Input
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))
                }
                placeholder="Optional existing image URL"
                value={form.thumbnailUrl}
              />
              <span className="text-xs leading-5 text-muted-foreground">
                Kept for legacy quizzes. Uploaded cover images automatically fill this value.
              </span>
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Estimated minutes
              <Input
                disabled={saving}
                min={1}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estimatedMinutes: Number(event.target.value)
                  }))
                }
                type="number"
                value={form.estimatedMinutes}
              />
              <FieldError message={fieldErrors.estimatedMinutes} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Time limit seconds
              <Input
                disabled={saving}
                min={0}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    timeLimitSeconds: Number(event.target.value)
                  }))
                }
                type="number"
                value={form.timeLimitSeconds}
              />
              <FieldError message={fieldErrors.timeLimitSeconds} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Tags
            <Input
              disabled={saving}
              onChange={(event) => setTagsValue(event.target.value)}
              placeholder="science, speed, mastery"
              value={tagsValue}
            />
          </label>
          {publishingReadiness.length ? (
            <div className="rounded-3xl border border-primary/20 bg-primary/8 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <AlertTriangle className="size-4" />
                Publishing readiness
              </div>
              <p className="mt-2 text-muted-foreground">
                These are admin hints for public quiz pages. You can still save drafts while improving them.
              </p>
              <ul className="mt-3 grid gap-2 leading-6 text-muted-foreground">
                {publishingReadiness.map((note) => (
                  <li className="rounded-2xl border border-border/70 bg-surface/70 px-3 py-2" key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Switch
              checked={form.isFeatured}
              disabled={saving}
              label="Featured quiz"
              description="Featured quizzes are prioritized in public discovery."
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isFeatured: checked }))}
            />
            <Switch
              checked={form.isDailyChallenge}
              disabled={saving}
              label="Daily challenge"
              description="Only one daily challenge should be highlighted later."
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isDailyChallenge: checked }))
              }
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : editing ? "Update quiz" : "Save draft"}
            </Button>
            {editing ? (
              <Button disabled={saving} onClick={resetForm} type="button" variant="secondary">
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="glass-panel grid gap-3 rounded-3xl p-4 lg:grid-cols-[1fr_10rem_12rem_10rem_10rem_10rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search quizzes"
            value={query}
          />
        </label>
        <Select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
        <Select onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}>
          <option value="all">All levels</option>
          {difficulties.map((item) => (
            <option key={item} value={item}>
              {titleCase(item)}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setFeatured(event.target.value as typeof featured)} value={featured}>
          <option value="all">All flags</option>
          <option value="featured">Featured</option>
          <option value="daily">Daily</option>
        </Select>
        <Select onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="updated">Updated</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
        </Select>
      </div>

      <AdminDataState
        empty={filtered.length === 0}
        emptyDescription="Create a quiz draft, then add questions before publishing it publicly."
        emptyTitle="No quizzes found"
        error={error}
        icon={FileQuestion}
        loading={loading}
      />

      {!loading && !error && filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((quiz) => (
            <Card className="p-5" key={quiz.id}>
              <div className="grid gap-4 xl:grid-cols-[9rem_1fr_auto] xl:items-center">
                <ImageDisplay
                  alt={quiz.coverImageAlt || quiz.title}
                  className="h-32 rounded-2xl"
                  compact
                  imageClassName="h-32 object-cover"
                  src={quiz.coverImageUrl || quiz.thumbnailUrl}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={quiz.status} />
                    <StatusBadge value={quiz.visibility} />
                    <StatusBadge value={quiz.difficulty}>{titleCase(quiz.difficulty)}</StatusBadge>
                    {quiz.isFeatured ? <StatusBadge value="featured">Featured</StatusBadge> : null}
                    {quiz.isDailyChallenge ? <StatusBadge value="daily">Daily</StatusBadge> : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{quiz.title || "Untitled quiz"}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {quiz.shortDescription || quiz.description || "No description yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                    <span>/{quiz.slug}</span>
                    <span>{quiz.categoryName || "No category"}</span>
                    <span>{quiz.questionCount} questions</span>
                    <span>{quiz.totalPoints} points</span>
                    <span>Updated {formatDate(quiz.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    href={`/admin/quizzes/${quiz.id}/questions`}
                    icon={<FileQuestion className="size-4" />}
                    size="sm"
                    variant="secondary"
                  >
                    Questions
                  </Button>
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => editQuiz(quiz)}
                    size="sm"
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  {quiz.status === "published" ? (
                    <Button
                      disabled={saving}
                      icon={<XCircle className="size-4" />}
                      onClick={() => void runAction(() => setQuizStatus(quiz.id, "draft"), "Quiz unpublished")}
                      size="sm"
                      variant="secondary"
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      disabled={saving}
                      icon={<Send className="size-4" />}
                      onClick={() => void runAction(() => publishQuiz(quiz.id), "Quiz published")}
                      size="sm"
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    disabled={saving || quiz.status === "archived"}
                    icon={<Archive className="size-4" />}
                    onClick={() => setArchiveTarget(quiz)}
                    size="sm"
                    variant="danger"
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Archive quiz"
        description="Archived quizzes disappear from public pages. They can still be edited from the admin list if filtered."
        loading={saving}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return;
          void runAction(() => archiveQuiz(archiveTarget.id), "Quiz archived").then(() =>
            setArchiveTarget(null)
          );
        }}
        open={Boolean(archiveTarget)}
        title="Archive this quiz?"
      />
    </div>
  );
}
