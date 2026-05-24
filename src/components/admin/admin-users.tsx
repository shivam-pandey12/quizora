"use client";

import { Search, ShieldAlert, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listAdminUsers } from "@/lib/firestore/admin-analytics";
import { formatDate } from "@/lib/firestore/timestamps";
import type { UserProfile } from "@/types/domain";

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "user">("all");
  const [activity, setActivity] = useState("all");

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }
      try {
        setUsers(await listAdminUsers(120));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load users.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cutoff =
      activity === "all" ? 0 : Date.now() - Number(activity) * 24 * 60 * 60 * 1000;
    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        [user.displayName, user.email, user.uid].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      const matchesRole = role === "all" || user.role === role;
      const matchesActivity =
        activity === "all" ||
        (user.lastActiveAt && new Date(user.lastActiveAt).getTime() >= cutoff);
      return matchesQuery && matchesRole && matchesActivity;
    });
  }, [activity, query, role, users]);

  const admins = users.filter((user) => user.role === "admin").length;
  const activeWeek = users.filter(
    (user) => user.lastActiveAt && Date.now() - new Date(user.lastActiveAt).getTime() <= 7 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Users</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">User directory</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Review profile health, activity, XP, quick match stats, and roles. Role changes stay deliberately controlled until custom claims/server-admin writes are added.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<UsersRound className="size-5" />} label="Loaded users" value={String(users.length)} helper="Bounded admin window" />
        <StatCard label="Admins" value={String(admins)} helper="Profile role source" />
        <StatCard label="Active this week" value={String(activeWeek)} helper="lastActiveAt sample" />
      </div>

      <Card className="p-4">
        <SectionHeader className="mb-4" title="Filters" />
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, UID" value={query} />
          </label>
          <Select onChange={(event) => setRole(event.target.value as typeof role)} value={role}>
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </Select>
          <Select onChange={(event) => setActivity(event.target.value)} value={activity}>
            <option value="all">All activity</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </Select>
        </div>
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Users appear after signup or Google sign-in creates a profile."
        emptyTitle="No users found"
        error={error}
        loading={loading}
      />

      {!loading && !error ? (
        <div className="grid gap-3">
          {filtered.map((user) => (
            <Card className="p-4" key={user.uid}>
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={user.role === "admin" ? "featured" : "active"}>{user.role}</StatusBadge>
                    <Badge>Level {user.level}</Badge>
                    <Badge>{user.currentStreak} day streak</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{user.displayName}</h2>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {user.email || "No email"} • {user.uid}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Joined {formatDate(user.createdAt)} • Last active {formatDate(user.lastActiveAt)}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 xl:text-right">
                  <span>{user.totalQuizzesPlayed} quizzes</span>
                  <span>{user.averageAccuracy}% avg</span>
                  <span>{user.quickMatchesPlayed} quick matches</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="border-warning/20 bg-warning/10 p-5 text-warning">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm leading-6">
            Phase 11 keeps role changes view-only in the UI. Production-grade admin authority should move to Firebase custom claims and trusted Admin SDK writes.
          </p>
        </div>
      </Card>
    </div>
  );
}
