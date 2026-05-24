"use client";

import { ExternalLink, MessageSquareWarning, Search } from "lucide-react";
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
import { formatDate } from "@/lib/firestore/timestamps";
import { listAdminReports, updateReportWorkflow } from "@/lib/firestore/reports";
import { titleCase } from "@/lib/utils";
import type { AdminPriority, Report, ReportType } from "@/types/domain";

export function AdminReports() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Report["status"] | "all">("all");
  const [type, setType] = useState<ReportType | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextReports = await listAdminReports({ count: 100 });
      setReports(nextReports);
      setNotes(Object.fromEntries(nextReports.map((report) => [report.id, report.adminNote])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesQuery =
        !normalized ||
        [report.targetLabel, report.reason, report.details, report.reportedByName].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      return matchesQuery && (status === "all" || report.status === status) && (type === "all" || report.type === type);
    });
  }, [query, reports, status, type]);

  async function update(report: Report, nextStatus: Report["status"], nextPriority: AdminPriority = report.priority) {
    setWorking(true);
    try {
      await updateReportWorkflow({
        report,
        status: nextStatus,
        priority: nextPriority,
        adminNote: notes[report.id] ?? "",
        adminId: user?.uid ?? "unknown"
      });
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: `report_${nextStatus}`,
        targetType: "report",
        targetId: report.id,
        targetLabel: report.targetLabel,
        details: `Report ${report.id} moved to ${nextStatus}.`
      });
      showToast({ tone: "success", title: "Report updated" });
      await load();
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Report update failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  const openCount = reports.filter((report) => report.status === "open").length;
  const reviewingCount = reports.filter((report) => report.status === "reviewing").length;
  const highPriority = reports.filter((report) => report.priority === "high").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Reports</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Content and safety reports</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Triage question, quiz, room, attempt, bug, and general reports without exposing moderation notes publicly.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<MessageSquareWarning className="size-5" />} label="Open" value={String(openCount)} helper="Needs first pass" />
        <StatCard label="Reviewing" value={String(reviewingCount)} helper="In progress" />
        <StatCard label="High priority" value={String(highPriority)} helper="Escalate first" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" value={query} />
          </label>
          <Select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
          <Select onChange={(event) => setType(event.target.value as typeof type)} value={type}>
            <option value="all">All types</option>
            {["question", "quiz", "room", "attempt", "user", "bug", "other"].map((item) => (
              <option key={item} value={item}>{titleCase(item)}</option>
            ))}
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Reports from quiz detail, result review, and support flows will appear here."
        emptyTitle="No reports found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((report) => (
            <Card className="p-4" key={report.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={report.status}>{report.status}</StatusBadge>
                    <Badge>{titleCase(report.type)}</Badge>
                    <Badge className={report.priority === "high" ? "text-danger" : "text-primary"}>{report.priority}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{report.targetLabel || "Untitled target"}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.details || report.reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    By {report.reportedByName} • {formatDate(report.createdAt)}
                  </p>
                  {report.targetUrl ? (
                    <Button className="mt-3" href={report.targetUrl} icon={<ExternalLink className="size-4" />} size="sm" variant="secondary">
                      Open target
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <Textarea
                    onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Admin note"
                    value={notes[report.id] ?? ""}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={working} onClick={() => void update(report, "reviewing")} size="sm" variant="secondary">Review</Button>
                    <Button disabled={working} onClick={() => void update(report, "resolved")} size="sm">Resolve</Button>
                    <Button disabled={working} onClick={() => void update(report, "dismissed")} size="sm" variant="danger">Dismiss</Button>
                    <Button disabled={working} onClick={() => void update(report, report.status, "high")} size="sm" variant="secondary">High</Button>
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
