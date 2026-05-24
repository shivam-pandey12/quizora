"use client";

import { ExternalLink, MessageSquare, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import { listAdminFeedback, updateFeedbackWorkflow } from "@/lib/firestore/feedback";
import { formatDate } from "@/lib/firestore/timestamps";
import { titleCase } from "@/lib/utils";
import type { AdminPriority, Feedback, FeedbackType } from "@/types/domain";

export function AdminFeedback() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Feedback["status"] | "all">("all");
  const [type, setType] = useState<FeedbackType | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextFeedback = await listAdminFeedback({ count: 100 });
      setFeedback(nextFeedback);
      setNotes(Object.fromEntries(nextFeedback.map((item) => [item.id, item.adminNote])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return feedback.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.name, item.email, item.message, item.pageUrl].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      return matchesQuery && (status === "all" || item.status === status) && (type === "all" || item.type === type);
    });
  }, [feedback, query, status, type]);

  async function update(item: Feedback, nextStatus: Feedback["status"], nextPriority: AdminPriority = item.priority) {
    setWorking(true);
    try {
      await updateFeedbackWorkflow({
        feedback: item,
        status: nextStatus,
        priority: nextPriority,
        adminNote: notes[item.id] ?? ""
      });
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: `feedback_${nextStatus}`,
        targetType: "feedback",
        targetId: item.id,
        targetLabel: item.type,
        details: `Feedback ${item.id} moved to ${nextStatus}.`
      });
      showToast({ tone: "success", title: "Feedback updated" });
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Feedback update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  const newCount = feedback.filter((item) => item.status === "new").length;
  const reviewingCount = feedback.filter((item) => item.status === "reviewing").length;
  const bugs = feedback.filter((item) => item.type === "bug").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Feedback</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">User feedback queue</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Triage product feedback, bug notes, UI comments, and quiz quality suggestions from signed-in users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<MessageSquare className="size-5" />} label="New" value={String(newCount)} helper="Needs triage" />
        <StatCard label="Reviewing" value={String(reviewingCount)} helper="In progress" />
        <StatCard label="Bugs" value={String(bugs)} helper="Bug-type feedback" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search feedback" value={query} />
          </label>
          <Select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="done">Done</option>
            <option value="dismissed">Dismissed</option>
          </Select>
          <Select onChange={(event) => setType(event.target.value as typeof type)} value={type}>
            <option value="all">All types</option>
            {["bug", "feature", "general", "ui", "quiz-quality"].map((item) => (
              <option key={item} value={item}>{titleCase(item)}</option>
            ))}
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Feedback from the contact page will appear here."
        emptyTitle="No feedback found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card className="p-4" key={item.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={item.status}>{item.status}</StatusBadge>
                    <Badge>{titleCase(item.type)}</Badge>
                    <Badge className={item.priority === "high" ? "text-danger" : "text-primary"}>{item.priority}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{item.name || "Signed-in user"}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.email || "No email"} • {formatDate(item.createdAt)}
                  </p>
                  {item.pageUrl ? (
                    <Button className="mt-3" href={item.pageUrl} icon={<ExternalLink className="size-4" />} size="sm" variant="secondary">
                      Open page
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <Textarea
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Admin note"
                    value={notes[item.id] ?? ""}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={working} onClick={() => void update(item, "reviewing")} size="sm" variant="secondary">Review</Button>
                    <Button disabled={working} onClick={() => void update(item, "done")} size="sm">Done</Button>
                    <Button disabled={working} onClick={() => void update(item, "dismissed")} size="sm" variant="danger">Dismiss</Button>
                    <Button disabled={working} onClick={() => void update(item, item.status, "high")} size="sm" variant="secondary">High</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
