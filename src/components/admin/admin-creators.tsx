"use client";

import { CheckCircle2, FileQuestion, Search, ShieldAlert, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { listAdminUsers } from "@/lib/firestore/admin-analytics";
import { listAdminQuizzes } from "@/lib/firestore/content";
import { reviewCreatorQuiz, updateCreatorStatus } from "@/lib/firestore/creator";
import type { CreatorStatus, Quiz, UserProfile } from "@/types/domain";

export function AdminCreators() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CreatorStatus | "all">("all");

  async function load() {
    setLoading(true);
    try {
      const [nextUsers, nextQuizzes] = await Promise.all([
        listAdminUsers(160),
        listAdminQuizzes()
      ]);
      setUsers(nextUsers);
      setQuizzes(nextQuizzes.filter((quiz) => quiz.ownerType === "creator"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const creators = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = status === "all" || user.creatorStatus === status;
      const matchesQuery = [user.displayName, user.email, user.uid].some((value) =>
        value.toLowerCase().includes(normalized)
      );
      return matchesStatus && matchesQuery && (user.creatorStatus !== "none" || normalized);
    });
  }, [query, status, users]);

  async function setCreator(user: UserProfile, nextStatus: CreatorStatus) {
    await updateCreatorStatus(user.uid, nextStatus);
    showToast({ tone: "success", title: "Creator status updated", description: `${user.displayName}: ${nextStatus}` });
    await load();
  }

  async function reviewQuiz(quiz: Quiz, reviewStatus: "approved" | "rejected") {
    await reviewCreatorQuiz(quiz.id, reviewStatus);
    showToast({ tone: "success", title: "Quiz review updated", description: `${quiz.title}: ${reviewStatus}` });
    await load();
  }

  const state = <AdminDataState loading={loading} error={null} empty={!creators.length && !quizzes.length} emptyTitle="No creators found" emptyDescription="Creator requests and class-use quiz drafts will appear here." />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Creator access and review" description="Approve teacher capability, pause access, and review creator-owned class-use quiz drafts." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<UserCog className="size-5" />} label="Creator accounts" value={String(users.filter((user) => user.creatorStatus !== "none").length)} helper="Pending, approved, or suspended" />
        <StatCard label="Approved" value={String(users.filter((user) => user.creatorStatus === "approved").length)} helper="Can create classes" />
        <StatCard icon={<FileQuestion className="size-5" />} label="Creator quizzes" value={String(quizzes.length)} helper="Class-use content" />
      </div>
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search creator name, email, UID" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value as CreatorStatus | "all")}>
            <option value="all">All creator statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="none">None</option>
          </Select>
        </div>
      </Card>
      {state}
      {!loading && creators.length ? (
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Creator accounts</h2>
          <div className="mt-5 grid gap-3">
            {creators.map((user) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={user.uid}>
                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <StatusBadge value={user.creatorStatus}>{user.creatorStatus}</StatusBadge>
                    <h3 className="mt-2 text-xl font-semibold">{user.displayName}</h3>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button icon={<CheckCircle2 className="size-4" />} onClick={() => void setCreator(user, "approved")} size="sm">Approve</Button>
                    <Button onClick={() => void setCreator(user, "pending")} size="sm" variant="secondary">Pending</Button>
                    <Button icon={<ShieldAlert className="size-4" />} onClick={() => void setCreator(user, "suspended")} size="sm" variant="danger">Suspend</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {!loading && quizzes.length ? (
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Creator quiz review</h2>
          <div className="mt-5 grid gap-3">
            {quizzes.map((quiz) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={quiz.id}>
                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={quiz.reviewStatus}>{quiz.reviewStatus}</StatusBadge>
                      <Badge>{quiz.publishScope}</Badge>
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">Owner: {quiz.ownerName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button href={`/admin/quizzes/${quiz.id}/questions`} size="sm" variant="secondary">Questions</Button>
                    <Button onClick={() => void reviewQuiz(quiz, "approved")} size="sm">Approve</Button>
                    <Button onClick={() => void reviewQuiz(quiz, "rejected")} size="sm" variant="danger">Reject</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
