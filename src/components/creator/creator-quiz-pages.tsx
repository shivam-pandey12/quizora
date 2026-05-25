"use client";

import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileQuestion,
  GraduationCap,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeCard } from "@/components/billing/billing-ui";
import { useToast } from "@/components/ui/toast-provider";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories } from "@/lib/firestore/content";
import {
  archiveCreatorQuiz,
  canUseCreatorTools,
  createCreatorQuestion,
  createCreatorQuizDraft,
  createCreatorRequest,
  creatorQuizDraftInput,
  deleteCreatorQuestion,
  getCreatorQuiz,
  getCreatorRequest,
  listCreatorQuestions,
  listCreatorQuizzes,
  submitCreatorQuizForReview,
  updateCreatorQuestion,
  updateCreatorQuizDraft
} from "@/lib/firestore/creator";
import { createSlug } from "@/lib/firestore/slug";
import { formatDate } from "@/lib/firestore/timestamps";
import { titleCase } from "@/lib/utils";
import type {
  Category,
  CreatorRequest,
  Question,
  QuestionInput,
  QuestionOption,
  QuestionType,
  Quiz,
  QuizDifficulty,
  QuizInput,
  QuizPublishScope,
  QuizReviewStatus
} from "@/types/domain";

const difficulties: QuizDifficulty[] = ["easy", "medium", "hard", "expert"];
const reviewTabs: Array<QuizReviewStatus | "all"> = ["all", "draft", "submitted", "approved", "rejected"];
const questionTypes: Array<Exclude<QuestionType, "text">> = [
  "single-choice",
  "multiple-choice",
  "true-false"
];

function AccessState({ compact = false }: { compact?: boolean }) {
  const { user, profile, loading, authReady } = useAuth();
  const [request, setRequest] = useState<CreatorRequest | null>(null);
  const requestHref = "/creator/request-access";

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void getCreatorRequest(user.uid).then(setRequest).catch(() => undefined);
  }, [user]);

  if (!authReady) {
    return <EmptyState icon={ShieldAlert} title="Firebase setup is required" description={firebaseSetupMessage} />;
  }
  if (loading) return <LoadingSkeleton variant={compact ? "card" : "page"} />;
  if (!user) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Sign in to open Creator Studio"
        description="Quizora creators can draft original quizzes after admin approval."
        actionHref="/login?next=/creator/quizzes"
        actionLabel="Sign in"
      />
    );
  }
  if (profile?.creatorStatus === "pending" || request?.status === "pending") {
    return (
      <EmptyState
        icon={Sparkles}
        title="Creator request pending"
        description="Your request is waiting for admin review. You can see the request status from the access page."
        actionHref={requestHref}
        actionLabel="View request"
      />
    );
  }
  if (request?.status === "rejected") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Creator request needs changes"
        description={request.adminNote || "Your creator request was not approved. Review the note on the access page or contact support."}
        actionHref={requestHref}
        actionLabel="View request"
      />
    );
  }
  if (profile?.creatorStatus === "suspended") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Creator access is paused"
        description="You can still view your history, but new quiz creation is paused by an admin."
        actionHref="/contact"
        actionLabel="Contact support"
      />
    );
  }
  return (
    <EmptyState
      icon={Lock}
      title="Creator approval required"
      description="Request creator access to create quiz drafts, manage questions, and submit public quizzes for review."
      actionHref={requestHref}
      actionLabel="Request access"
    />
  );
}

function canEditQuiz(quiz: Quiz | null, userId: string | undefined, admin = false) {
  if (!quiz || !userId) return false;
  if (admin) return true;
  return (
    quiz.ownerId === userId &&
    quiz.ownerType === "creator" &&
    (quiz.reviewStatus === "draft" || quiz.reviewStatus === "rejected") &&
    quiz.status !== "published"
  );
}

function quizFormFromInput(input: QuizInput) {
  return {
    ...input,
    tagsText: input.tags.join(", ")
  };
}

type QuizFormState = ReturnType<typeof quizFormFromInput>;

function buildQuizInputFromState(state: QuizFormState): QuizInput {
  const { tagsText, ...rest } = state;
  return {
    ...rest,
    tags: tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
}

function questionBlank(quizId: string, order: number): QuestionInput {
  return {
    quizId,
    type: "single-choice",
    questionText: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" }
    ],
    correctAnswer: "",
    correctAnswers: [],
    explanation: "",
    imageUrl: "",
    points: 2,
    timeLimitSeconds: 30,
    order,
    status: "active"
  };
}

function questionToInput(question: Question): QuestionInput {
  return {
    quizId: question.quizId,
    type: question.type === "text" ? "single-choice" : question.type,
    questionText: question.questionText,
    options: question.options.length ? question.options : questionBlank(question.quizId, question.order).options,
    correctAnswer: question.correctAnswer,
    correctAnswers: question.correctAnswers,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    order: question.order,
    status: question.status
  };
}

function qualityChecklist(quiz: Quiz | null, questions: Question[]) {
  const active = questions.filter((question) => question.status === "active");
  return [
    { label: "Quiz title, slug, category, and descriptions are complete", done: Boolean(quiz?.title && quiz?.slug && quiz?.categoryId && quiz?.description && quiz?.shortDescription) },
    { label: "At least five active questions are added", done: active.length >= 5 },
    { label: "Every active question has a valid answer", done: active.every((question) => question.type === "multiple-choice" ? question.correctAnswers.length > 0 : Boolean(question.correctAnswer)) },
    { label: "Every active question has an explanation", done: active.every((question) => Boolean(question.explanation.trim())) },
    { label: "Content is original, safe for students, and not copied", done: true }
  ];
}

function Checklist({ quiz, questions }: { quiz: Quiz | null; questions: Question[] }) {
  const items = qualityChecklist(quiz, questions);
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div className="flex gap-3 rounded-2xl border border-border bg-surface/70 p-3 text-sm" key={item.label}>
          {item.done ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-danger" />}
          <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CreatorRequestAccessPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [request, setRequest] = useState<CreatorRequest | null>(null);
  const [form, setForm] = useState({
    reason: "",
    interests: "",
    experience: "",
    intendedUse: "public quizzes",
    agreementAccepted: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void getCreatorRequest(user.uid).then(setRequest).catch(() => undefined);
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await createCreatorRequest({ user, profile, ...form });
      setRequest(await getCreatorRequest(user.uid));
      await refreshProfile();
      showToast({ tone: "success", title: "Creator request sent", description: "An admin can now review your request." });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="container-page space-y-6 pb-16">
      <PageHeader
        eyebrow="Creator access"
        title="Request Quizora creator access"
        description="Tell us what you want to create. Public publishing stays review-based so the catalog remains accurate, original, and student-safe."
      />
      {loading ? <LoadingSkeleton variant="page" /> : null}
      {!loading && !user ? <AccessState /> : null}
      {!loading && user && canUseCreatorTools(profile) ? (
        <Card className="p-6">
          <StatusBadge value="approved">Approved</StatusBadge>
          <h2 className="mt-3 text-2xl font-semibold">You already have creator access</h2>
          <p className="mt-2 text-muted-foreground">Open Creator Studio to draft quizzes and manage classroom content.</p>
          <Button className="mt-5" href="/creator/quizzes" icon={<FileQuestion className="size-4" />}>Open quizzes</Button>
        </Card>
      ) : null}
      {!loading && user && !canUseCreatorTools(profile) && request ? (
        <Card className="p-6">
          <StatusBadge value={request.status}>{titleCase(request.status)}</StatusBadge>
          <h2 className="mt-3 text-2xl font-semibold">Your request is {request.status}</h2>
          <p className="mt-2 text-muted-foreground">Submitted {formatDate(request.createdAt)}.</p>
          {request.adminNote ? <p className="mt-4 rounded-2xl border border-border bg-surface/70 p-4 text-sm">{request.adminNote}</p> : null}
        </Card>
      ) : null}
      {!loading && user && !canUseCreatorTools(profile) && !request ? (
        <Card className="p-6">
          <form className="grid gap-4" onSubmit={submit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Why do you want creator access?</span>
              <Textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="I want to build original quizzes for..." />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Topic interests</span>
              <Input value={form.interests} onChange={(event) => setForm((current) => ({ ...current, interests: event.target.value }))} placeholder="Science, reasoning, classroom GK..." />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Quiz creation experience</span>
              <Input value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))} placeholder="Optional" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Intended use</span>
              <Select value={form.intendedUse} onChange={(event) => setForm((current) => ({ ...current, intendedUse: event.target.value }))}>
                <option value="public quizzes">Public quizzes</option>
                <option value="classroom">Classroom</option>
                <option value="private practice">Private practice</option>
              </Select>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface/70 p-4 text-sm">
              <input className="mt-1" checked={form.agreementAccepted} onChange={(event) => setForm((current) => ({ ...current, agreementAccepted: event.target.checked }))} type="checkbox" />
              <span>I will create original, safe, accurate quiz content and avoid copied exam/book/web questions.</span>
            </label>
            <FieldError message={error ?? undefined} />
            <Button disabled={saving} icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} type="submit">
              Send request
            </Button>
          </form>
        </Card>
      ) : null}
    </section>
  );
}

export function CreatorQuizzesPage() {
  const { user, profile } = useAuth();
  const { plan, hasFeature, getLimit } = useEntitlement();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [reviewStatus, setReviewStatus] = useState<QuizReviewStatus | "all">("all");
  const [scope, setScope] = useState<QuizPublishScope | "all">("all");
  const [confirmAction, setConfirmAction] = useState<{ type: "submit" | "archive"; quiz: Quiz } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setQuizzes(await listCreatorQuizzes(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isFirebaseConfigured) void load();
  }, [load, user]);

  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  if (!canUseCreatorTools(profile)) {
    return (
      <section className="container-page space-y-6 pb-16">
        <PageHeader eyebrow="Creator Studio" title="Create Quizora quizzes" description="Draft original quizzes and submit public content for review." />
        <AccessState />
      </section>
    );
  }

  const filtered = quizzes.filter((quiz) => {
    const needle = query.trim().toLowerCase();
    return (
      (reviewStatus === "all" || quiz.reviewStatus === reviewStatus) &&
      (scope === "all" || quiz.publishScope === scope) &&
      (!needle || [quiz.title, quiz.categoryName, quiz.slug].some((value) => value.toLowerCase().includes(needle)))
    );
  });
  const creatorLimit = adminOverride ? Infinity : getLimit("maxCreatorQuizzes");
  const canCreateByPlan = adminOverride || hasFeature("creator.createQuizzes") || profile?.creatorStatus === "approved";

  async function submitReview(quiz: Quiz) {
    if (!user) return;
    try {
      await submitCreatorQuizForReview(quiz.id, await user.getIdToken());
      showToast({ tone: "success", title: "Submitted for review", description: "Admins can now review this quiz for public publishing." });
      setConfirmAction(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Review submission blocked", description: caught instanceof Error ? caught.message : "Could not submit quiz." });
    }
  }

  async function archive(quiz: Quiz) {
    if (!user) return;
    try {
      await archiveCreatorQuiz(quiz.id, user.uid);
      showToast({ tone: "success", title: "Quiz archived", description: quiz.title });
      setConfirmAction(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Archive failed", description: caught instanceof Error ? caught.message : "Could not archive quiz." });
    }
  }

  return (
    <section className="container-page space-y-6 pb-16">
      <PageHeader eyebrow="Creator Studio" title="My quiz drafts" description="Create private/classroom quizzes, preview questions, and submit public-ready quizzes for admin review." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Plan</p><p className="mt-2 text-2xl font-semibold">{plan.name}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Creator quizzes</p><p className="mt-2 text-2xl font-semibold">{quizzes.length}{Number.isFinite(creatorLimit) ? `/${creatorLimit}` : ""}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Submitted</p><p className="mt-2 text-2xl font-semibold">{quizzes.filter((quiz) => quiz.reviewStatus === "submitted").length}</p></Card>
      </div>
      {!canCreateByPlan ? <UpgradeCard title="Unlock creator quiz drafts" description="Creator and Classroom plans raise limits for private quizzes, class-only workflows, and creator analytics." /> : null}
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_13rem_13rem_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search your quizzes" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as QuizReviewStatus | "all")}>
            {reviewTabs.map((tab) => <option key={tab} value={tab}>{tab === "all" ? "All review states" : titleCase(tab)}</option>)}
          </Select>
          <Select value={scope} onChange={(event) => setScope(event.target.value as QuizPublishScope | "all")}>
            <option value="all">All scopes</option>
            <option value="private">Private</option>
            <option value="class-only">Class-only</option>
            <option value="global">Public review</option>
          </Select>
          <Button disabled={!canCreateByPlan || quizzes.length >= creatorLimit} href="/creator/quizzes/new" icon={<Plus className="size-4" />}>New quiz</Button>
        </div>
      </Card>
      {loading ? <LoadingSkeleton variant="page" /> : null}
      {!loading && !filtered.length ? (
        <EmptyState icon={FileQuestion} title="No creator quizzes yet" description="Start with a private draft, then switch it to public review when it is ready for admin approval." actionHref="/creator/quizzes/new" actionLabel="Create quiz" />
      ) : null}
      {!loading && filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((quiz) => (
            <Card className="p-5" key={quiz.id}>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={quiz.reviewStatus}>{titleCase(quiz.reviewStatus)}</StatusBadge>
                <StatusBadge value={quiz.status}>{titleCase(quiz.status)}</StatusBadge>
                <Badge>{quiz.publishScope === "global" ? "public review" : quiz.publishScope}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold">{quiz.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{quiz.shortDescription || quiz.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <span>{quiz.categoryName}</span>
                <span>{quiz.questionCount} questions</span>
                <span>{quiz.totalPoints} points</span>
                <span>{formatDate(quiz.updatedAt)}</span>
              </div>
              {quiz.rejectionNote ? <p className="mt-4 rounded-2xl border border-danger/25 bg-danger/8 p-3 text-sm">{quiz.rejectionNote}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={`/creator/quizzes/${quiz.id}/edit`} size="sm" variant="secondary" icon={<Pencil className="size-4" />}>Edit</Button>
                <Button href={`/creator/quizzes/${quiz.id}/questions`} size="sm" variant="secondary" icon={<FileQuestion className="size-4" />}>Questions</Button>
                <Button href={`/creator/quizzes/${quiz.id}/preview`} size="sm" variant="secondary" icon={<Eye className="size-4" />}>Preview</Button>
                {(quiz.reviewStatus === "draft" || quiz.reviewStatus === "rejected") && quiz.publishScope === "global" ? (
                  <Button onClick={() => setConfirmAction({ type: "submit", quiz })} size="sm" icon={<Send className="size-4" />}>Submit</Button>
                ) : null}
                {quiz.status !== "archived" && quiz.reviewStatus !== "approved" ? (
                  <Button onClick={() => setConfirmAction({ type: "archive", quiz })} size="sm" variant="danger" icon={<Archive className="size-4" />}>Archive</Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        confirmLabel={confirmAction?.type === "submit" ? "Submit for review" : "Archive quiz"}
        description={
          confirmAction?.type === "submit"
            ? `"${confirmAction.quiz.title}" will be sent to admins for public publishing review. You will not be able to freely edit it while it is under review.`
            : `"${confirmAction?.quiz.title ?? "This quiz"}" will be archived and hidden from your active creator workflow. Existing records are not deleted.`
        }
        loading={Boolean(confirmAction && (confirmAction.type === "submit" ? false : false))}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "submit") void submitReview(confirmAction.quiz);
          if (confirmAction.type === "archive") void archive(confirmAction.quiz);
        }}
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "submit" ? "Submit quiz for review?" : "Archive this quiz?"}
      />
    </section>
  );
}

export function CreatorQuizFormPage({ quizId }: { quizId?: string }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState<QuizFormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(quizId));
  const [loading, setLoading] = useState(Boolean(quizId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    const activeUser = user;
    async function load() {
      const nextCategories = await listPublicCategories();
      setCategories(nextCategories);
      if (quizId) {
        const nextQuiz = await getCreatorQuiz(quizId);
        setQuiz(nextQuiz);
        if (nextQuiz) {
          setForm(quizFormFromInput({
            title: nextQuiz.title,
            slug: nextQuiz.slug,
            description: nextQuiz.description,
            shortDescription: nextQuiz.shortDescription,
            categoryId: nextQuiz.categoryId,
            categoryName: nextQuiz.categoryName,
            difficulty: nextQuiz.difficulty,
            status: nextQuiz.status,
            visibility: "private",
            thumbnailUrl: nextQuiz.thumbnailUrl,
            tags: nextQuiz.tags,
            estimatedMinutes: nextQuiz.estimatedMinutes,
            timeLimitSeconds: nextQuiz.timeLimitSeconds,
            isFeatured: false,
            isDailyChallenge: false,
            createdBy: nextQuiz.createdBy,
            updatedBy: activeUser.uid,
            ownerId: nextQuiz.ownerId,
            ownerName: nextQuiz.ownerName,
            ownerEmail: nextQuiz.ownerEmail || activeUser.email || "",
            ownerType: "creator",
            publishScope: nextQuiz.publishScope,
            reviewStatus: nextQuiz.reviewStatus === "rejected" ? "draft" : nextQuiz.reviewStatus,
            rejectionNote: nextQuiz.rejectionNote || "",
            submittedAt: nextQuiz.submittedAt,
            reviewedAt: nextQuiz.reviewedAt,
            reviewedBy: nextQuiz.reviewedBy || "",
            reviewedByName: nextQuiz.reviewedByName || "",
            approvedAt: nextQuiz.approvedAt,
            approvedBy: nextQuiz.approvedBy || "",
            creatorEditable: true,
            allowedClassIds: nextQuiz.allowedClassIds
          }));
        }
      } else if (nextCategories[0]) {
        const draft = creatorQuizDraftInput({
          user: activeUser,
          profile,
          category: nextCategories[0],
          title: "",
          description: "",
          shortDescription: "",
          tags: [],
          publishScope: "private"
        });
        setForm(quizFormFromInput(draft));
      }
      setLoading(false);
    }
    void load().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load quiz form.");
      setLoading(false);
    });
  }, [quizId, profile, user]);

  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  if (!canUseCreatorTools(profile)) {
    return <section className="container-page pb-16"><AccessState /></section>;
  }
  if (loading || !form) {
    return <section className="container-page pb-16"><LoadingSkeleton variant="page" /></section>;
  }
  if (quizId && !canEditQuiz(quiz, user?.uid, adminOverride)) {
    return (
      <section className="container-page pb-16">
        <EmptyState icon={Lock} title="This quiz is locked" description="Submitted or approved creator quizzes cannot be edited here. Rejected quizzes can be edited and resubmitted." actionHref="/creator/quizzes" actionLabel="Back to quizzes" />
      </section>
    );
  }

  function update<K extends keyof QuizFormState>(key: K, value: QuizFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !form) return;
    const category = categories.find((item) => item.id === form.categoryId);
    if (!category) {
      setError("Choose a category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = buildQuizInputFromState({
        ...form,
        categoryName: category.name,
        updatedBy: user.uid,
        ownerEmail: profile?.email || user.email || ""
      });
      const savedId = quizId ? quizId : await createCreatorQuizDraft(input);
      if (quizId) await updateCreatorQuizDraft(quizId, input);
      showToast({ tone: "success", title: quizId ? "Quiz updated" : "Quiz draft created", description: "Now add questions and preview the result." });
      router.push(`/creator/quizzes/${savedId}/questions`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this quiz.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="container-page space-y-6 pb-16">
      <PageHeader eyebrow="Creator quiz" title={quizId ? "Edit quiz draft" : "Create quiz draft"} description="Public Quizora publishing requires admin review. Private and class-only drafts stay hidden from the public catalog." />
      <Card className="p-6">
        <form className="grid gap-5" onSubmit={submit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-semibold">Title</span><Input value={form.title} onChange={(event) => { const title = event.target.value; update("title", title); if (!slugTouched) update("slug", createSlug(title)); }} placeholder="World Geography Warm-Up" /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Slug</span><Input value={form.slug} onChange={(event) => { setSlugTouched(true); update("slug", createSlug(event.target.value)); }} placeholder="world-geography-warm-up" /></label>
          </div>
          <label className="grid gap-2"><span className="text-sm font-semibold">Short description</span><Input value={form.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} /></label>
          <label className="grid gap-2"><span className="text-sm font-semibold">Full description</span><Textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2"><span className="text-sm font-semibold">Category</span><Select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Difficulty</span><Select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value as QuizDifficulty)}>{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{titleCase(difficulty)}</option>)}</Select></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Minutes</span><Input min={1} type="number" value={form.estimatedMinutes} onChange={(event) => update("estimatedMinutes", Number(event.target.value))} /></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Total timer sec</span><Input min={0} type="number" value={form.timeLimitSeconds} onChange={(event) => update("timeLimitSeconds", Number(event.target.value))} /></label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-semibold">Publish scope</span><Select value={form.publishScope} onChange={(event) => update("publishScope", event.target.value as QuizPublishScope)}><option value="private">Private practice</option><option value="class-only">Class-only</option><option value="global">Public review</option></Select></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Tags</span><Input value={form.tagsText} onChange={(event) => update("tagsText", event.target.value)} placeholder="maps, capitals, beginner" /></label>
          </div>
          <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
            Public review quizzes are private until an admin approves and publishes them. Creators cannot feature, daily-pick, or self-publish quizzes.
          </div>
          <FieldError message={error ?? undefined} />
          <div className="flex flex-wrap gap-3">
            <Button disabled={saving} icon={saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} type="submit">{quizId ? "Save changes" : "Create draft"}</Button>
            <Button href="/creator/quizzes" variant="secondary">Cancel</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export function CreatorQuizQuestionsPage({ quizId }: { quizId: string }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState<QuestionInput>(() => questionBlank(quizId, 1));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextQuiz, nextQuestions] = await Promise.all([getCreatorQuiz(quizId), listCreatorQuestions(quizId)]);
    setQuiz(nextQuiz);
    setQuestions(nextQuestions);
    setForm(questionBlank(quizId, nextQuestions.length + 1));
    setEditingId(null);
    setLoading(false);
  }, [quizId]);
  useEffect(() => {
    if (isFirebaseConfigured) void load().catch(() => setLoading(false));
  }, [load]);

  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  if (!canUseCreatorTools(profile)) return <section className="container-page pb-16"><AccessState /></section>;
  if (loading) return <section className="container-page pb-16"><LoadingSkeleton variant="page" /></section>;
  if (!canEditQuiz(quiz, user?.uid, adminOverride)) {
    return <section className="container-page pb-16"><EmptyState icon={Lock} title="Question manager is locked" description="You can edit questions only while the quiz is a draft or rejected revision." actionHref={`/creator/quizzes/${quizId}/preview`} actionLabel="Preview quiz" /></section>;
  }

  function setOption(index: number, option: QuestionOption) {
    setForm((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? option : item) }));
  }
  function changeType(type: Exclude<QuestionType, "text">) {
    setForm((current) => ({
      ...current,
      type,
      options: type === "true-false" ? [{ id: "true", text: "True" }, { id: "false", text: "False" }] : current.options.length >= 2 ? current.options : questionBlank(quizId, current.order).options,
      correctAnswer: "",
      correctAnswers: []
    }));
  }
  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateCreatorQuestion(editingId, form);
        showToast({ tone: "success", title: "Question updated" });
      } else {
        await createCreatorQuestion(form);
        showToast({ tone: "success", title: "Question added" });
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this question.");
    } finally {
      setSaving(false);
    }
  }
  async function confirmDeleteQuestion() {
    if (!deleteTarget) return;
    try {
      await deleteCreatorQuestion(deleteTarget.id, quizId);
      showToast({ tone: "success", title: "Question deleted" });
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Delete failed", description: caught instanceof Error ? caught.message : "Could not delete question." });
    }
  }

  return (
    <section className="container-page space-y-6 pb-16">
      <PageHeader eyebrow="Creator questions" title={quiz?.title || "Quiz questions"} description="Add original questions with clear answers and explanations. Text-answer questions stay disabled for creator publishing in this version." />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <Card className="p-5">
          <SectionHeader title="Questions" description={`${questions.filter((question) => question.status === "active").length} active questions`} />
          <div className="mt-5 grid gap-3">
            {questions.map((question) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={question.id}>
                <div className="flex flex-wrap gap-2">
                  <Badge>#{question.order}</Badge><Badge>{question.type}</Badge><StatusBadge value={question.status}>{titleCase(question.status)}</StatusBadge>
                </div>
                <h3 className="mt-2 font-semibold">{question.questionText}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(question.id); setForm(questionToInput(question)); }} icon={<Pencil className="size-4" />}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget(question)} icon={<Trash2 className="size-4" />}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title={editingId ? "Edit question" : "Add question"} />
          <form className="mt-5 grid gap-4" onSubmit={saveQuestion}>
            <label className="grid gap-2"><span className="text-sm font-semibold">Type</span><Select value={form.type} onChange={(event) => changeType(event.target.value as Exclude<QuestionType, "text">)}>{questionTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</Select></label>
            <label className="grid gap-2"><span className="text-sm font-semibold">Question</span><Textarea value={form.questionText} onChange={(event) => setForm((current) => ({ ...current, questionText: event.target.value }))} /></label>
            {form.type !== "true-false" ? form.options.map((option, index) => (
              <label className="grid gap-2" key={option.id}><span className="text-sm font-semibold">Option {index + 1}</span><Input value={option.text} onChange={(event) => setOption(index, { ...option, text: event.target.value })} /></label>
            )) : null}
            {form.type !== "multiple-choice" ? (
              <label className="grid gap-2"><span className="text-sm font-semibold">Correct answer</span><Select value={form.correctAnswer} onChange={(event) => setForm((current) => ({ ...current, correctAnswer: event.target.value }))}>{form.options.filter((option) => option.text.trim()).map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}</Select></label>
            ) : (
              <div className="grid gap-2">
                <span className="text-sm font-semibold">Correct answers</span>
                {form.options.filter((option) => option.text.trim()).map((option) => (
                  <label className="flex gap-3 rounded-2xl border border-border bg-surface/70 p-3 text-sm" key={option.id}>
                    <input checked={form.correctAnswers.includes(option.id)} onChange={(event) => setForm((current) => ({ ...current, correctAnswers: event.target.checked ? [...current.correctAnswers, option.id] : current.correctAnswers.filter((id) => id !== option.id) }))} type="checkbox" />
                    {option.text}
                  </label>
                ))}
              </div>
            )}
            <label className="grid gap-2"><span className="text-sm font-semibold">Explanation</span><Textarea value={form.explanation} onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))} /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Points</span>
                <Input min={1} type="number" value={form.points} onChange={(event) => setForm((current) => ({ ...current, points: Number(event.target.value) }))} />
                <span className="text-xs text-muted-foreground">Score awarded for a correct answer.</span>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Time limit</span>
                <Input min={0} type="number" value={form.timeLimitSeconds} onChange={(event) => setForm((current) => ({ ...current, timeLimitSeconds: Number(event.target.value) }))} />
                <span className="text-xs text-muted-foreground">Seconds allowed for this question.</span>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Order</span>
                <Input min={1} type="number" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))} />
                <span className="text-xs text-muted-foreground">Position in the quiz.</span>
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Question status</span>
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Question["status"] }))}><option value="active">Active</option><option value="hidden">Hidden</option></Select>
            </label>
            <FieldError message={error ?? undefined} />
            <Button disabled={saving} type="submit" icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}>{editingId ? "Save question" : "Add question"}</Button>
            {editingId ? <Button variant="secondary" onClick={() => { setEditingId(null); setForm(questionBlank(quizId, questions.length + 1)); }}>Cancel edit</Button> : null}
          </form>
        </Card>
      </div>
      <ConfirmDialog
        confirmLabel="Delete question"
        description={`This removes "${deleteTarget?.questionText || "this question"}" from the creator quiz. The quiz points and question count will update after deletion.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteQuestion()}
        open={Boolean(deleteTarget)}
        title="Delete this question?"
      />
    </section>
  );
}

export function CreatorQuizPreviewPage({ quizId }: { quizId: string }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const load = useCallback(async () => {
    const [nextQuiz, nextQuestions] = await Promise.all([getCreatorQuiz(quizId), listCreatorQuestions(quizId)]);
    setQuiz(nextQuiz);
    setQuestions(nextQuestions);
    setLoading(false);
  }, [quizId]);
  useEffect(() => {
    if (isFirebaseConfigured) void load().catch(() => setLoading(false));
  }, [load]);

  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  if (!canUseCreatorTools(profile)) return <section className="container-page pb-16"><AccessState /></section>;
  if (loading) return <section className="container-page pb-16"><LoadingSkeleton variant="page" /></section>;
  if (!quiz || (!adminOverride && quiz.ownerId !== user?.uid)) {
    return <section className="container-page pb-16"><EmptyState icon={Lock} title="Preview unavailable" description="You can preview only quizzes you own." /></section>;
  }

  async function submitReview() {
    if (!user || !quiz) return;
    try {
      await submitCreatorQuizForReview(quiz.id, await user.getIdToken());
      showToast({ tone: "success", title: "Submitted for review" });
      setConfirmSubmit(false);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Could not submit", description: caught instanceof Error ? caught.message : "Fix the checklist and try again." });
    }
  }

  const checklist = qualityChecklist(quiz, questions);
  const ready = checklist.every((item) => item.done) && quiz.publishScope === "global";

  return (
    <section className="container-page space-y-6 pb-16">
      <PageHeader eyebrow="Creator preview" title={quiz.title} description={quiz.description || "Preview how this quiz will feel before sending it for review."} />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2"><StatusBadge value={quiz.reviewStatus}>{titleCase(quiz.reviewStatus)}</StatusBadge><Badge>{quiz.categoryName}</Badge><Badge>{quiz.difficulty}</Badge></div>
          <p className="mt-4 text-muted-foreground">{quiz.shortDescription}</p>
          <div className="mt-6 grid gap-4">
            {questions.map((question) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={question.id}>
                <Badge>Question {question.order}</Badge>
                <h3 className="mt-3 text-lg font-semibold">{question.questionText}</h3>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => {
                    const correct = question.type === "multiple-choice" ? question.correctAnswers.includes(option.id) : question.correctAnswer === option.id;
                    return <div className={`rounded-2xl border p-3 text-sm ${correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-surface/70"}`} key={option.id}>{option.text}</div>;
                  })}
                </div>
                <p className="mt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {question.explanation || "Missing explanation."}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5"><SectionHeader title="Review checklist" /><div className="mt-4"><Checklist quiz={quiz} questions={questions} /></div></Card>
          <Card className="p-5">
            <SectionHeader title="Actions" />
            <div className="mt-4 grid gap-3">
              <Button href={`/creator/quizzes/${quiz.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>Edit metadata</Button>
              <Button href={`/creator/quizzes/${quiz.id}/questions`} variant="secondary" icon={<FileQuestion className="size-4" />}>Manage questions</Button>
              <Button disabled={!ready || quiz.reviewStatus === "submitted" || quiz.reviewStatus === "approved"} onClick={() => setConfirmSubmit(true)} icon={<ClipboardCheck className="size-4" />}>Submit for review</Button>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        confirmLabel="Submit for review"
        description={`"${quiz.title}" will be locked for admin review and stays private until an admin approves and publishes it.`}
        onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => void submitReview()}
        open={confirmSubmit}
        title="Send this quiz to admins?"
      />
    </section>
  );
}
