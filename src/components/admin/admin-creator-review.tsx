"use client";

import {
  Archive,
  CheckCircle2,
  Eye,
  FileQuestion,
  Loader2,
  Search,
  ShieldCheck,
  UserCog,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  listAdminCreatorRequests,
  listAllCreatorQuizzesForAdmin
} from "@/lib/firestore/creator";
import { formatDate } from "@/lib/firestore/timestamps";
import { titleCase } from "@/lib/utils";
import type { CreatorRequest, CreatorRequestStatus, Quiz, QuizReviewStatus } from "@/types/domain";

async function postAdminReview(
  path: string,
  token: string,
  body: Record<string, unknown>
) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Review action failed.");
}

export function AdminCreatorRequestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CreatorRequestStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<{ request: CreatorRequest; action: "approve" | "reject" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listAdminCreatorRequests(status));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load creator requests.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) =>
      !needle ||
      [request.displayName, request.email, request.userId, request.interests].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [query, requests]);

  async function review(request: CreatorRequest, action: "approve" | "reject") {
    if (!user) return;
    setSavingId(`${request.id}_${action}`);
    try {
      await postAdminReview("/api/admin/creator-requests/review", await user.getIdToken(), {
        requestId: request.id,
        action,
        note: notes[request.id] ?? ""
      });
      showToast({ tone: "success", title: `Request ${action}d`, description: request.displayName });
      setConfirmRequest(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Review failed", description: caught instanceof Error ? caught.message : "Could not review request." });
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Creator access requests" description="Approve trusted creators and teachers without allowing users to promote themselves." />
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search creator requests" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value as CreatorRequestStatus | "all")}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All requests</option>
          </Select>
        </div>
      </Card>
      <FieldError message={error ?? undefined} />
      {loading ? <LoadingSkeleton variant="page" /> : null}
      {!loading && !filtered.length ? <EmptyState icon={UserCog} title="No creator requests" description="New access requests will appear here." /> : null}
      {!loading && filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((request) => (
            <Card className="p-5" key={request.id}>
              <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={request.status}>{titleCase(request.status)}</StatusBadge>
                    <Badge>{request.intendedUse}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{request.displayName}</h2>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{request.email} | {request.userId}</p>
                  <p className="mt-4 text-sm text-muted-foreground">{request.reason}</p>
                  <div className="mt-4 grid gap-2 text-sm">
                    <p><span className="font-semibold">Interests:</span> {request.interests}</p>
                    <p><span className="font-semibold">Experience:</span> {request.experience || "Not provided"}</p>
                    <p><span className="font-semibold">Submitted:</span> {formatDate(request.createdAt)}</p>
                  </div>
                  {request.adminNote ? <p className="mt-4 rounded-2xl border border-border bg-surface/70 p-3 text-sm">{request.adminNote}</p> : null}
                </div>
                <div className="grid gap-3">
                  <Textarea placeholder="Admin note, required when rejecting" value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} />
                  <Button disabled={request.status === "approved" || savingId === `${request.id}_approve`} onClick={() => setConfirmRequest({ request, action: "approve" })} icon={savingId === `${request.id}_approve` ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}>Approve creator</Button>
                  <Button disabled={request.status === "rejected" || savingId === `${request.id}_reject`} onClick={() => setConfirmRequest({ request, action: "reject" })} variant="danger" icon={savingId === `${request.id}_reject` ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}>Reject request</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        confirmLabel={confirmRequest?.action === "approve" ? "Approve creator" : "Reject request"}
        description={
          confirmRequest?.action === "approve"
            ? `${confirmRequest.request.displayName} will be granted creator access and can create quiz drafts for review.`
            : `${confirmRequest?.request.displayName ?? "This user"} will not receive creator access. Add a helpful admin note before rejecting.`
        }
        loading={Boolean(confirmRequest && savingId === `${confirmRequest.request.id}_${confirmRequest.action}`)}
        onCancel={() => setConfirmRequest(null)}
        onConfirm={() => {
          if (!confirmRequest) return;
          void review(confirmRequest.request, confirmRequest.action);
        }}
        open={Boolean(confirmRequest)}
        title={confirmRequest?.action === "approve" ? "Approve creator access?" : "Reject this request?"}
      />
    </div>
  );
}

export function AdminCreatorQuizzesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [reviewStatus, setReviewStatus] = useState<QuizReviewStatus | "all">("submitted");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmQuiz, setConfirmQuiz] = useState<{ quiz: Quiz; action: "approve" | "reject" | "archive" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuizzes(await listAllCreatorQuizzesForAdmin());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load creator quizzes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesStatus = reviewStatus === "all" || quiz.reviewStatus === reviewStatus;
      const matchesQuery =
        !needle ||
        [quiz.title, quiz.ownerName, quiz.slug, quiz.categoryName].some((value) =>
          value.toLowerCase().includes(needle)
        );
      return matchesStatus && matchesQuery;
    });
  }, [query, quizzes, reviewStatus]);

  async function review(quiz: Quiz, action: "approve" | "reject" | "archive") {
    if (!user) return;
    setSavingId(`${quiz.id}_${action}`);
    try {
      await postAdminReview("/api/admin/creator-quizzes/review", await user.getIdToken(), {
        quizId: quiz.id,
        action,
        note: notes[quiz.id] ?? ""
      });
      showToast({ tone: "success", title: `Quiz ${action}d`, description: quiz.title });
      setConfirmQuiz(null);
      await load();
    } catch (caught) {
      showToast({ tone: "error", title: "Review failed", description: caught instanceof Error ? caught.message : "Could not review quiz." });
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Creator quiz review" description="Inspect creator submissions, reject with helpful notes, or approve safe quizzes into the public catalog." />
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search quiz, creator, slug" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as QuizReviewStatus | "all")}>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All review states</option>
          </Select>
        </div>
      </Card>
      <FieldError message={error ?? undefined} />
      {loading ? <LoadingSkeleton variant="page" /> : null}
      {!loading && !filtered.length ? <EmptyState icon={ShieldCheck} title="No creator quizzes found" description="Submitted creator quizzes will appear here for public publishing review." /> : null}
      {!loading && filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((quiz) => (
            <Card className="p-5" key={quiz.id}>
              <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={quiz.reviewStatus}>{titleCase(quiz.reviewStatus)}</StatusBadge>
                    <StatusBadge value={quiz.status}>{titleCase(quiz.status)}</StatusBadge>
                    <Badge>{quiz.publishScope === "global" ? "public review" : quiz.publishScope}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{quiz.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">By {quiz.ownerName} | {quiz.categoryName} | {quiz.questionCount} questions | {quiz.totalPoints} points</p>
                  <p className="mt-4 text-sm text-muted-foreground">{quiz.shortDescription || quiz.description}</p>
                  {quiz.rejectionNote ? <p className="mt-4 rounded-2xl border border-danger/25 bg-danger/8 p-3 text-sm">{quiz.rejectionNote}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button href={`/creator/quizzes/${quiz.id}/preview`} size="sm" variant="secondary" icon={<Eye className="size-4" />}>Preview</Button>
                    <Button href={`/admin/quizzes/${quiz.id}/questions`} size="sm" variant="secondary" icon={<FileQuestion className="size-4" />}>Admin questions</Button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Textarea placeholder="Rejection/archive note" value={notes[quiz.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [quiz.id]: event.target.value }))} />
                  <Button disabled={quiz.reviewStatus === "approved" || savingId === `${quiz.id}_approve`} onClick={() => setConfirmQuiz({ quiz, action: "approve" })} icon={savingId === `${quiz.id}_approve` ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}>Approve and publish</Button>
                  <Button disabled={savingId === `${quiz.id}_reject`} onClick={() => setConfirmQuiz({ quiz, action: "reject" })} variant="danger" icon={savingId === `${quiz.id}_reject` ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}>Reject with note</Button>
                  <Button disabled={quiz.status === "archived" || savingId === `${quiz.id}_archive`} onClick={() => setConfirmQuiz({ quiz, action: "archive" })} variant="secondary" icon={savingId === `${quiz.id}_archive` ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}>Archive</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        confirmLabel={
          confirmQuiz?.action === "approve"
            ? "Approve and publish"
            : confirmQuiz?.action === "archive"
              ? "Archive quiz"
              : "Reject quiz"
        }
        description={
          confirmQuiz?.action === "approve"
            ? `"${confirmQuiz.quiz.title}" will become public in the Quizora catalog and can be played by users.`
            : confirmQuiz?.action === "archive"
              ? `"${confirmQuiz.quiz.title}" will be archived and removed from public or review surfaces. Add an archive note first.`
              : `"${confirmQuiz?.quiz.title ?? "This quiz"}" will be rejected and returned to the creator with your note.`
        }
        loading={Boolean(confirmQuiz && savingId === `${confirmQuiz.quiz.id}_${confirmQuiz.action}`)}
        onCancel={() => setConfirmQuiz(null)}
        onConfirm={() => {
          if (!confirmQuiz) return;
          void review(confirmQuiz.quiz, confirmQuiz.action);
        }}
        open={Boolean(confirmQuiz)}
        title={
          confirmQuiz?.action === "approve"
            ? "Approve this creator quiz?"
            : confirmQuiz?.action === "archive"
              ? "Archive this creator quiz?"
              : "Reject this creator quiz?"
        }
      />
    </div>
  );
}
