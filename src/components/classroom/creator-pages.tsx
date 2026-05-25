"use client";

import {
  Archive,
  BarChart3,
  BookOpen,
  ClipboardList,
  Copy,
  DoorOpen,
  Download,
  FileQuestion,
  GraduationCap,
  Loader2,
  Plus,
  RadioTower,
  ShieldAlert,
  Sparkles,
  UsersRound
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { UpgradeCard } from "@/components/billing/billing-ui";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories, listPublicQuizzes } from "@/lib/firestore/content";
import {
  archiveClassroom,
  canTeach,
  classResultsToCsv,
  createClassLiveRoom,
  createClassroom,
  listClassMembers,
  listClassSubmissions,
  listCreatorClasses,
  regenerateClassInvite
} from "@/lib/firestore/classrooms";
import { createCreatorQuizDraft, creatorQuizDraftInput, listCreatorQuizzes, submitCreatorQuizForReview } from "@/lib/firestore/creator";
import { createAssignment, listClassAssignments, listTeacherAssignments } from "@/lib/firestore/assignments";
import { getClassAnalytics } from "@/lib/firestore/classroom-analytics";
import { formatDate } from "@/lib/firestore/timestamps";
import { titleCase } from "@/lib/utils";
import type {
  Assignment,
  Category,
  ClassAnalyticsSnapshot,
  ClassMember,
  ClassroomClass,
  Quiz,
  RoomInput
} from "@/types/domain";

function CreatorGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, authReady } = useAuth();
  const adminOverride = hasAdminAccess({ email: user?.email, profile });

  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={ShieldAlert} title="Firebase setup is required" description={firebaseSetupMessage} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container-page py-12">
        <LoadingSkeleton variant="page" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={GraduationCap}
          title="Teacher sign in required"
          description="Sign in to open the Quizora creator classroom workspace."
          actionHref="/login?next=/creator"
          actionLabel="Sign in"
        />
      </div>
    );
  }
  if (!adminOverride && profile?.creatorStatus === "pending") {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Sparkles}
          title="Creator approval is pending"
          description="An admin can approve this account from the creators panel. Your classroom tools unlock after approval."
          actionHref="/dashboard"
          actionLabel="Back to dashboard"
        />
      </div>
    );
  }
  if (!adminOverride && profile?.creatorStatus === "suspended") {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShieldAlert}
          title="Creator access is paused"
          description="This account cannot create or manage classes until an admin restores creator access."
        />
      </div>
    );
  }
  if (!adminOverride && !canTeach(profile)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={GraduationCap}
          title="Creator approval required"
          description="Quizora classroom tools are available to admin-approved teachers and creators."
          actionHref="/creator/request-access"
          actionLabel="Request access"
        />
      </div>
    );
  }

  return children;
}

function classInviteUrl(classroom: ClassroomClass) {
  if (typeof window === "undefined") return `/classes/join?code=${classroom.inviteCode}`;
  return `${window.location.origin}/classes/join?code=${classroom.inviteCode}`;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CreatorDashboard() {
  const { user, profile } = useAuth();
  const { plan } = useEntitlement();
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    let mounted = true;
    const uid = user.uid;
    async function load() {
      const [nextClasses, nextAssignments, nextQuizzes] = await Promise.all([
        listCreatorClasses(uid),
        listTeacherAssignments(uid),
        listCreatorQuizzes(uid)
      ]);
      if (!mounted) return;
      setClasses(nextClasses);
      setAssignments(nextAssignments);
      setQuizzes(nextQuizzes);
      setLoading(false);
    }
    void load().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <CreatorGate>
      <PageHeader
        eyebrow="Creator Studio"
        title="Classroom command center"
        description="Create private classes, assign quizzes, run live rooms, and review student progress from one calm workspace."
      />
      <section className="container-page pb-16">
        {loading ? <LoadingSkeleton variant="page" /> : null}
        {!loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<GraduationCap className="size-5" />} label="Classes" value={String(classes.length)} helper="Private class groups you own" />
              <StatCard icon={<ClipboardList className="size-5" />} label="Assignments" value={String(assignments.length)} helper="Draft, active, and closed work" />
              <StatCard icon={<FileQuestion className="size-5" />} label="Creator quizzes" value={String(quizzes.length)} helper="Class-use quiz drafts" />
              <StatCard icon={<Sparkles className="size-5" />} label="Status" value={titleCase(profile?.creatorStatus ?? "approved")} helper="Admin-controlled access" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Button href="/creator/classes/create" icon={<Plus className="size-4" />}>Create class</Button>
              <Button href="/creator/classes" variant="secondary" icon={<UsersRound className="size-4" />}>Manage classes</Button>
              <Button href="/creator/assignments" variant="secondary" icon={<ClipboardList className="size-4" />}>Assignments</Button>
              <Button href="/creator/quizzes" variant="secondary" icon={<FileQuestion className="size-4" />}>Creator quizzes</Button>
              <Button href="/creator/results" variant="secondary" icon={<Download className="size-4" />}>Results</Button>
            </div>
            {plan.id === "free" ? (
              <UpgradeCard
                title="Scale your classroom workflows"
                description="Creator and Classroom passes increase class, assignment, creator quiz, export, and analytics limits."
              />
            ) : null}
            <Card className="p-5">
              <SectionHeader title="Recent classes" description="Open a class dashboard to manage members, assignments, analytics, and rooms." />
              <ClassGrid classes={classes.slice(0, 6)} />
            </Card>
          </div>
        ) : null}
      </section>
    </CreatorGate>
  );
}

function ClassGrid({ classes }: { classes: ClassroomClass[] }) {
  if (!classes.length) {
    return (
      <EmptyState
        className="mt-5"
        icon={GraduationCap}
        title="No classes yet"
        description="Create a private classroom and invite students with a code."
        actionHref="/creator/classes/create"
        actionLabel="Create class"
      />
    );
  }
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {classes.map((classroom) => (
        <Card className="overflow-hidden p-0" key={classroom.id}>
          <div className={`h-24 bg-gradient-to-br ${classroom.coverAccent}`} />
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={classroom.status} />
              <Badge>{classroom.subject}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{classroom.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{classroom.description || "Private Quizora class."}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <span>{classroom.memberCount} members</span>
              <span>{classroom.assignmentCount} assignments</span>
            </div>
            <Button className="mt-5" fullWidth href={`/creator/classes/${classroom.id}`} variant="secondary">
              Open class
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CreatorClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void listCreatorClasses(user.uid).then(setClasses).finally(() => setLoading(false));
  }, [user]);

  return (
    <CreatorGate>
      <PageHeader eyebrow="Classes" title="Manage classroom groups" description="Invite students, assign quizzes, and run private live quiz rooms." />
      <section className="container-page pb-16">
        <div className="mb-5 flex justify-end">
          <Button href="/creator/classes/create" icon={<Plus className="size-4" />}>Create class</Button>
        </div>
        {loading ? <LoadingSkeleton variant="page" /> : <ClassGrid classes={classes} />}
      </section>
    </CreatorGate>
  );
}

export function CreateClassPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    subject: "",
    gradeLevel: "",
    coverAccent: "from-amber-200 via-stone-100 to-sky-100",
    organizationName: profile?.teacherProfile.organizationName ?? ""
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setWorking(true);
    try {
      const id = await createClassroom({ user, profile, input: form });
      showToast({ tone: "success", title: "Class created", description: "Invite code is ready on the class dashboard." });
      router.push(`/creator/classes/${id}`);
    } catch (caught) {
      showToast({ tone: "error", title: "Class was not created", description: caught instanceof Error ? caught.message : "Try again." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <CreatorGate>
      <PageHeader eyebrow="New class" title="Create a private classroom" description="Build a focused class space for assignments, live rooms, and student progress." />
      <section className="container-page pb-16">
        <form className="grid gap-6 lg:grid-cols-[1fr_24rem]" onSubmit={submit}>
          <Card className="p-5">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Class name
                <Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Grade 9 Science Sprint" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Description
                <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="A private Quizora class for weekly mastery checks." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Subject
                  <Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Science" />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Grade level
                  <Input value={form.gradeLevel} onChange={(event) => setForm((current) => ({ ...current, gradeLevel: event.target.value }))} placeholder="Grade 9" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                Organization
                <Input value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))} placeholder="Optional school or cohort name" />
              </label>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-2xl font-semibold">Preview</h2>
            <div className={`mt-5 h-28 rounded-3xl bg-gradient-to-br ${form.coverAccent}`} />
            <h3 className="mt-4 text-xl font-semibold">{form.name || "Your class name"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{form.description || "Private invite-only class."}</p>
            <Button className="mt-6" disabled={working || !form.name.trim()} fullWidth type="submit">
              {working ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create class
            </Button>
          </Card>
        </form>
      </section>
    </CreatorGate>
  );
}

export function TeacherClassWorkspace({ classId, tab = "overview" }: { classId: string; tab?: "overview" | "members" | "assignments" | "analytics" | "rooms" }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [classroom, setClassroom] = useState<ClassroomClass | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [analytics, setAnalytics] = useState<ClassAnalyticsSnapshot | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    quizId: "",
    title: "",
    instructions: "",
    dueAt: "",
    status: "published" as const,
    allowLateSubmission: true,
    attemptLimit: 1,
    showResultsImmediately: true
  });
  const [roomQuizId, setRoomQuizId] = useState("");

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    let mounted = true;
    async function load() {
      const { getClassroom } = await import("@/lib/firestore/classrooms");
      const nextClass = await getClassroom(classId);
      if (!nextClass) {
        if (mounted) setLoading(false);
        return;
      }
      const [nextMembers, nextAssignments, nextAnalytics, nextQuizzes] = await Promise.all([
        listClassMembers(classId),
        listClassAssignments(classId, true),
        getClassAnalytics(classId),
        listPublicQuizzes()
      ]);
      if (!mounted) return;
      setClassroom(nextClass);
      setMembers(nextMembers);
      setAssignments(nextAssignments);
      setAnalytics(nextAnalytics);
      setQuizzes(nextQuizzes);
      setAssignmentForm((current) => ({ ...current, quizId: nextQuizzes[0]?.id ?? "" }));
      setRoomQuizId(nextQuizzes[0]?.id ?? "");
      setLoading(false);
    }
    void load().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [classId, user]);

  const ownerAllowed = classroom && user && (classroom.ownerId === user.uid || hasAdminAccess({ email: user.email, profile }));

  async function copyInvite() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classInviteUrl(classroom));
    showToast({ tone: "success", title: "Invite link copied", description: classroom.inviteCode });
  }

  async function regenerateInvite() {
    if (!classroom || !user) return;
    const code = await regenerateClassInvite(classroom, user.uid);
    showToast({ tone: "success", title: "Invite regenerated", description: code });
    setClassroom({ ...classroom, inviteCode: code });
  }

  async function createClassAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classroom || !user) return;
    const id = await createAssignment({
      user,
      profile,
      classroom,
      input: { ...assignmentForm, dueAt: assignmentForm.dueAt || null }
    });
    showToast({ tone: "success", title: "Assignment created", description: "Students can now see it in their class." });
    router.push(`/creator/classes/${classroom.id}/assignments`);
    setAssignments(await listClassAssignments(classroom.id, true));
    setAssignmentForm((current) => ({ ...current, title: "", instructions: "" }));
    return id;
  }

  async function createRoomForClass() {
    if (!classroom || !user || !roomQuizId) return;
    const input: Omit<RoomInput, "source" | "visibility" | "classId" | "className" | "allowedMemberOnly"> = {
      roomTitle: `${classroom.name} live room`,
      roomDescription: "Private class-only Quizora room.",
      quizId: roomQuizId,
      locked: false,
      maxPlayers: 40,
      questionTimerSeconds: 30,
      showCorrectAfterEachQuestion: false,
      allowLateJoin: false,
      requireReady: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      autoAdvance: false,
      autoAdvanceDelaySeconds: 5,
      scoringMode: "standard"
    };
    const roomCode = await createClassLiveRoom({ user, profile, classroom, input });
    showToast({ tone: "success", title: "Class room created", description: roomCode });
    router.push(`/rooms/${roomCode}`);
  }

  async function exportResults() {
    if (!classroom) return;
    const submissions = await listClassSubmissions(classroom.id);
    downloadText(`${classroom.name.replace(/\s+/g, "-").toLowerCase()}-results.csv`, classResultsToCsv(submissions));
  }
  async function archiveCurrentClass() {
    if (!classroom) return;
    await archiveClassroom(classroom.id);
    setConfirmArchive(false);
    router.push("/creator/classes");
  }

  if (loading) {
    return (
      <CreatorGate>
        <div className="container-page py-12"><LoadingSkeleton variant="page" /></div>
      </CreatorGate>
    );
  }
  if (!classroom || !ownerAllowed) {
    return (
      <CreatorGate>
        <div className="container-page py-16">
          <EmptyState icon={ShieldAlert} title="Class unavailable" description="This class was not found, or this account cannot manage it." />
        </div>
      </CreatorGate>
    );
  }

  return (
    <CreatorGate>
      <PageHeader eyebrow="Class workspace" title={classroom.name} description={classroom.description || "Private Quizora classroom."} />
      <section className="container-page pb-16">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["members", "Members"],
            ["assignments", "Assignments"],
            ["analytics", "Analytics"],
            ["rooms", "Rooms"]
          ].map(([value, label]) => (
            <Button key={value} href={`/creator/classes/${classroom.id}${value === "overview" ? "" : `/${value}`}`} variant={tab === value ? "primary" : "secondary"}>
              {label}
            </Button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<UsersRound className="size-5" />} label="Members" value={String(classroom.memberCount)} helper="Active class membership" />
              <StatCard icon={<ClipboardList className="size-5" />} label="Assignments" value={String(assignments.length)} helper="Draft and published work" />
              <StatCard icon={<BarChart3 className="size-5" />} label="Accuracy" value={`${analytics?.averageAccuracy ?? 0}%`} helper="Recent submissions" />
              <StatCard icon={<DoorOpen className="size-5" />} label="Rooms" value={String(classroom.roomCount)} helper="Class live rooms created" />
            </div>
            <Card className="p-5">
              <SectionHeader title="Invite students" description="Share this link with students. They must sign in before joining." />
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <Input readOnly value={classInviteUrl(classroom)} />
                <Button icon={<Copy className="size-4" />} onClick={() => void copyInvite()}>Copy</Button>
                <Button variant="secondary" onClick={() => void regenerateInvite()}>Regenerate</Button>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "members" ? (
          <Card className="p-5">
            <SectionHeader title="Class members" description="Students see safe roster details; teacher/admin views can include email." />
            <div className="mt-5 grid gap-3">
              {members.map((member) => (
                <div className="rounded-3xl border border-border bg-surface/70 p-4" key={member.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Badge>{member.role}</Badge>
                      <h3 className="mt-2 text-lg font-semibold">{member.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{member.email || "No email stored"}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Joined {formatDate(member.joinedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {tab === "assignments" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <Card className="p-5">
              <SectionHeader title="Assignments" />
              <div className="mt-5 grid gap-3">
                {assignments.map((assignment) => (
                  <div className="rounded-3xl border border-border bg-surface/70 p-4" key={assignment.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={assignment.status} />
                      <Badge>{assignment.quizTitle}</Badge>
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{assignment.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Due {formatDate(assignment.dueAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Assign quiz" />
              <form className="mt-5 grid gap-4" onSubmit={(event) => void createClassAssignment(event)}>
                <label className="grid gap-2 text-sm font-semibold">
                  Quiz
                  <Select value={assignmentForm.quizId} onChange={(event) => setAssignmentForm((current) => ({ ...current, quizId: event.target.value }))}>
                    {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Title
                  <Input required value={assignmentForm.title} onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Instructions
                  <Textarea value={assignmentForm.instructions} onChange={(event) => setAssignmentForm((current) => ({ ...current, instructions: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Due date
                  <Input type="datetime-local" value={assignmentForm.dueAt} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueAt: event.target.value }))} />
                </label>
                <Switch checked={assignmentForm.showResultsImmediately} label="Show result immediately" onCheckedChange={(checked) => setAssignmentForm((current) => ({ ...current, showResultsImmediately: checked }))} />
                <Button disabled={!assignmentForm.quizId || !assignmentForm.title.trim()} type="submit">Create assignment</Button>
              </form>
            </Card>
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Students" value={String(analytics?.totalStudents ?? 0)} helper="Active students" />
              <StatCard label="Completion" value={`${analytics?.completionRate ?? 0}%`} helper="Submission coverage" />
              <StatCard label="Accuracy" value={`${analytics?.averageAccuracy ?? 0}%`} helper="Average submitted accuracy" />
              <StatCard label="Active assignments" value={String(analytics?.activeAssignments ?? 0)} helper="Published work" />
            </div>
            <Card className="p-5">
              <SectionHeader title="Class leaderboard" />
              <div className="mt-5 grid gap-3">
                {analytics?.leaderboard.map((row) => (
                  <div className="flex items-center justify-between rounded-3xl border border-border bg-surface/70 p-4" key={row.userId}>
                    <div>
                      <Badge>#{row.rank}</Badge>
                      <h3 className="mt-2 font-semibold">{row.displayName}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{row.totalScore} pts • {row.averageAccuracy}%</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "rooms" ? (
          <Card className="p-5">
            <SectionHeader title="Create class live room" description="This creates a private class-only live room using the existing room engine." />
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <Select value={roomQuizId} onChange={(event) => setRoomQuizId(event.target.value)}>
                {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
              </Select>
              <Button disabled={!roomQuizId} icon={<RadioTower className="size-4" />} onClick={() => void createRoomForClass()}>
                Create room
              </Button>
            </div>
            <Button className="mt-4" variant="secondary" icon={<Download className="size-4" />} onClick={() => void exportResults()}>
              Export class results CSV
            </Button>
          </Card>
        ) : null}

        <div className="mt-6">
          <Button variant="danger" icon={<Archive className="size-4" />} onClick={() => setConfirmArchive(true)}>
            Archive class
          </Button>
        </div>
        <ConfirmDialog
          confirmLabel="Archive class"
          description={`This archives "${classroom.name}" and closes it for normal classroom activity. Existing members, assignments, and results stay available for review.`}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={() => void archiveCurrentClass()}
          open={confirmArchive}
          title="Archive this class?"
        />
      </section>
    </CreatorGate>
  );
}

export function CreatorAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  useEffect(() => {
    if (user) void listTeacherAssignments(user.uid).then(setAssignments);
  }, [user]);
  return (
    <CreatorGate>
      <PageHeader eyebrow="Assignments" title="All classroom assignments" description="A bounded view of work across your classes." />
      <section className="container-page pb-16">
        <div className="grid gap-3">
          {assignments.map((assignment) => (
            <Card className="p-4" key={assignment.id}>
              <StatusBadge value={assignment.status} />
              <h2 className="mt-2 text-xl font-semibold">{assignment.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{assignment.className} • {assignment.quizTitle}</p>
            </Card>
          ))}
        </div>
      </section>
    </CreatorGate>
  );
}

export function CreatorResultsPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  useEffect(() => {
    if (user) void listCreatorClasses(user.uid).then(setClasses);
  }, [user]);
  return (
    <CreatorGate>
      <PageHeader eyebrow="Results" title="Export class results" description="Open a class workspace to export student results as CSV." />
      <section className="container-page pb-16">
        <ClassGrid classes={classes} />
      </section>
    </CreatorGate>
  );
}

export function CreatorQuizzesPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reviewTarget, setReviewTarget] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!user) return;
    void Promise.all([listCreatorQuizzes(user.uid), listPublicCategories()]).then(([nextQuizzes, nextCategories]) => {
      setQuizzes(nextQuizzes);
      setCategories(nextCategories);
      setCategoryId(nextCategories[0]?.id ?? "");
    });
  }, [user]);

  async function createDraft() {
    if (!user || !categoryId || !title.trim()) return;
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    const input = creatorQuizDraftInput({ user, profile, category, title });
    await createCreatorQuizDraft(input);
    showToast({ tone: "success", title: "Creator quiz draft created", description: "Add questions from the admin quiz question manager." });
    setTitle("");
    setQuizzes(await listCreatorQuizzes(user.uid));
  }
  async function submitForReview(quiz: Quiz) {
    await submitCreatorQuizForReview(quiz.id);
    showToast({ tone: "success", title: "Quiz submitted for review", description: quiz.title });
    setReviewTarget(null);
    if (user) setQuizzes(await listCreatorQuizzes(user.uid));
  }

  return (
    <CreatorGate>
      <PageHeader eyebrow="Creator quizzes" title="Class-use quiz drafts" description="Create private class-only quiz drafts. Global publishing still requires admin review." />
      <section className="container-page grid gap-6 pb-16 lg:grid-cols-[1fr_24rem]">
        <Card className="p-5">
          <SectionHeader title="Your creator quizzes" />
          <div className="mt-5 grid gap-3">
            {quizzes.map((quiz) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={quiz.id}>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={quiz.status} />
                  <StatusBadge value={quiz.reviewStatus}>{titleCase(quiz.reviewStatus)}</StatusBadge>
                  <Badge>{quiz.publishScope}</Badge>
                </div>
                <h2 className="mt-2 text-xl font-semibold">{quiz.title}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href={`/admin/quizzes/${quiz.id}/questions`} size="sm" variant="secondary">Questions</Button>
                  {quiz.reviewStatus === "draft" ? (
                    <Button size="sm" onClick={() => setReviewTarget(quiz)}>Submit review</Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="New draft" />
          <div className="mt-5 grid gap-4">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quiz title" />
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Button disabled={!title.trim() || !categoryId} onClick={() => void createDraft()} icon={<BookOpen className="size-4" />}>
              Create draft
            </Button>
          </div>
        </Card>
      </section>
      <ConfirmDialog
        confirmLabel="Submit for review"
        description={`"${reviewTarget?.title ?? "This quiz"}" will be sent to admins for review and stays private until it is approved.`}
        onCancel={() => setReviewTarget(null)}
        onConfirm={() => {
          if (!reviewTarget) return;
          void submitForReview(reviewTarget);
        }}
        open={Boolean(reviewTarget)}
        title="Submit this quiz for review?"
      />
    </CreatorGate>
  );
}
