"use client";

import { NotebookTabs, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listAdminLogs } from "@/lib/firestore/admin-logs";
import { formatDate } from "@/lib/firestore/timestamps";
import { titleCase } from "@/lib/utils";
import type { AdminLog } from "@/types/domain";

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState("all");

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }
      try {
        setLogs(await listAdminLogs({ count: 120 }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load audit log.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const targetTypes = Array.from(new Set(logs.map((log) => log.targetType).filter(Boolean))).sort();
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesQuery =
        !normalized ||
        [log.adminName, log.action, log.targetLabel, log.details].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      return matchesQuery && (targetType === "all" || log.targetType === targetType);
    });
  }, [logs, query, targetType]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Audit log</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Admin activity log</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Read-only activity records for important admin actions. Logs are intentionally concise and avoid private answer snapshots.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<NotebookTabs className="size-5" />} label="Loaded logs" value={String(logs.length)} helper="Recent admin actions" />
        <StatCard label="Target types" value={String(targetTypes.length)} helper="Content areas touched" />
        <StatCard label="Mode" value="Read-only" helper="Admin-only collection" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search logs" value={query} />
          </label>
          <Select onChange={(event) => setTargetType(event.target.value)} value={targetType}>
            <option value="all">All targets</option>
            {targetTypes.map((item) => (
              <option key={item} value={item}>{titleCase(item)}</option>
            ))}
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Important admin actions will appear here as Phase 11 tools are used."
        emptyTitle="No audit logs found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((log) => (
            <Card className="p-4" key={log.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{titleCase(log.targetType || "general")}</Badge>
                    <Badge className="text-primary">{log.action}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{log.targetLabel || log.targetId}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{log.details}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {log.adminName} • {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
