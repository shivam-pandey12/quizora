"use client";

import { Archive, GraduationCap, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { archiveClassroom, listAdminClasses } from "@/lib/firestore/classrooms";
import { formatDate } from "@/lib/firestore/timestamps";
import type { ClassroomClass } from "@/types/domain";

export function AdminClasses() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<ClassroomClass | null>(null);

  async function load() {
    setLoading(true);
    try {
      setClasses(await listAdminClasses(120));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return classes.filter((item) =>
      [item.name, item.ownerName, item.subject, item.inviteCode].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [classes, query]);

  const active = classes.filter((item) => item.status === "active").length;

  async function archive(classroom: ClassroomClass) {
    await archiveClassroom(classroom.id);
    showToast({ tone: "success", title: "Class archived", description: classroom.name });
    setArchiveTarget(null);
    await load();
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Classroom monitor" description="Review private classes, owners, invite codes, and classroom health." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<GraduationCap className="size-5" />} label="Loaded classes" value={String(classes.length)} helper="Bounded admin window" />
        <StatCard label="Active" value={String(active)} helper="Open classroom groups" />
        <StatCard icon={<UsersRound className="size-5" />} label="Members" value={String(classes.reduce((sum, item) => sum + item.memberCount, 0))} helper="Across loaded classes" />
      </div>
      <Card className="p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-11" placeholder="Search class, owner, subject, invite code" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </Card>
      <AdminDataState empty={!filtered.length} loading={loading} error={null} emptyTitle="No classes found" emptyDescription="Classroom records will appear here after teachers create classes." />
      {!loading && filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((classroom) => (
            <Card className="p-5" key={classroom.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={classroom.status} />
                    <Badge>{classroom.subject}</Badge>
                    <Badge>{classroom.inviteCode}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{classroom.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Owner: {classroom.ownerName} • Created {formatDate(classroom.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {classroom.memberCount} members • {classroom.assignmentCount} assignments • {classroom.roomCount} rooms
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={`/creator/classes/${classroom.id}`} variant="secondary">Open</Button>
                  {classroom.status === "active" ? (
                    <Button icon={<Archive className="size-4" />} onClick={() => setArchiveTarget(classroom)} variant="danger">
                      Archive
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        confirmLabel="Archive class"
        description={`This archives "${archiveTarget?.name ?? "this class"}" and closes it for normal classroom activity. Existing members, assignments, and results are kept for review.`}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return;
          void archive(archiveTarget);
        }}
        open={Boolean(archiveTarget)}
        title="Archive this class?"
      />
    </div>
  );
}
