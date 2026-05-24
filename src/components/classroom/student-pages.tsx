"use client";

import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Trophy,
  UsersRound
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { getAssignment, getAssignmentForStudent, getAssignmentSubmission, listClassAssignments, listStudentAssignments } from "@/lib/firestore/assignments";
import { getClassAnalytics } from "@/lib/firestore/classroom-analytics";
import { getClassMember, getClassroom, joinClassByCode, listUserClasses } from "@/lib/firestore/classrooms";
import { getAttempt } from "@/lib/firestore/attempts";
import { formatDate } from "@/lib/firestore/timestamps";
import type { Assignment, AssignmentSubmission, Attempt, ClassAnalyticsSnapshot, ClassroomClass } from "@/types/domain";

function StudentGate({ children }: { children: React.ReactNode }) {
  const { user, loading, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={LockKeyhole} title="Firebase setup is required" description={firebaseSetupMessage} />
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
          title="Sign in to open classes"
          description="Classrooms, assignments, and student progress are private to signed-in Quizora accounts."
          actionHref="/login?next=/classes"
          actionLabel="Sign in"
        />
      </div>
    );
  }
  return children;
}

function assignmentHref(assignment: Assignment) {
  const params = new URLSearchParams({
    assignmentId: assignment.id,
    classId: assignment.classId,
    className: assignment.className,
    assignmentTitle: assignment.title
  });
  if (assignment.dueAt) params.set("dueAt", assignment.dueAt);
  return `/play/${assignment.quizId}?${params.toString()}`;
}

export function StudentClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void Promise.all([listUserClasses(user.uid), listStudentAssignments(user.uid)])
      .then(([nextClasses, nextAssignments]) => {
        setClasses(nextClasses);
        setAssignments(nextAssignments);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <StudentGate>
      <PageHeader eyebrow="Classes" title="Your Quizora classes" description="Open private class spaces, complete assignments, and follow your class leaderboard." />
      <section className="container-page pb-16">
        {loading ? <LoadingSkeleton variant="page" /> : null}
        {!loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard icon={<GraduationCap className="size-5" />} label="Joined classes" value={String(classes.length)} helper="Active memberships" />
              <StatCard icon={<CalendarClock className="size-5" />} label="Pending assignments" value={String(assignments.length)} helper="Published assignments" />
              <StatCard icon={<Trophy className="size-5" />} label="Class mode" value="Private" helper="Noindex student workspace" />
            </div>
            <div className="flex justify-end">
              <Button href="/classes/join" icon={<UsersRound className="size-4" />}>Join class</Button>
            </div>
            {!classes.length ? (
              <EmptyState icon={GraduationCap} title="No classes yet" description="Join a class using the code your teacher shared." actionHref="/classes/join" actionLabel="Join class" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {classes.map((classroom) => (
                  <Card className="overflow-hidden p-0" key={classroom.id}>
                    <div className={`h-20 bg-gradient-to-br ${classroom.coverAccent}`} />
                    <div className="p-5">
                      <Badge>{classroom.subject}</Badge>
                      <h2 className="mt-3 text-2xl font-semibold">{classroom.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Teacher: {classroom.ownerName}</p>
                      <Button className="mt-5" fullWidth href={`/classes/${classroom.id}`} variant="secondary">Open class</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </StudentGate>
  );
}

export function JoinClassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [working, setWorking] = useState(false);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setWorking(true);
    try {
      const classId = await joinClassByCode({ code, user, profile });
      showToast({ tone: "success", title: "Class joined", description: "Your class dashboard is ready." });
      router.push(`/classes/${classId}`);
    } catch (caught) {
      showToast({ tone: "error", title: "Could not join class", description: caught instanceof Error ? caught.message : "Check the code and try again." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <StudentGate>
      <PageHeader eyebrow="Join class" title="Enter your class code" description="Class codes are private invites from your teacher or creator." />
      <section className="container-page pb-16">
        <Card className="mx-auto max-w-xl p-6">
          <form className="grid gap-4" onSubmit={join}>
            <label className="grid gap-2 text-sm font-semibold">
              Invite code
              <Input className="text-center text-2xl tracking-[0.25em]" maxLength={12} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABC123" />
            </label>
            <Button disabled={working || !code.trim()} type="submit" fullWidth>
              {working ? <Loader2 className="size-4 animate-spin" /> : <UsersRound className="size-4" />}
              Join class
            </Button>
          </form>
        </Card>
      </section>
    </StudentGate>
  );
}

export function StudentClassWorkspace({ classId, tab = "overview" }: { classId: string; tab?: "overview" | "assignments" | "leaderboard" }) {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomClass | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [analytics, setAnalytics] = useState<ClassAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    let mounted = true;
    const uid = user.uid;
    async function load() {
      const [member, nextClass] = await Promise.all([
        getClassMember(classId, uid),
        getClassroom(classId)
      ]);
      if (!member || member.status !== "active" || !nextClass) {
        if (mounted) setLoading(false);
        return;
      }
      const [nextAssignments, nextAnalytics] = await Promise.all([
        listClassAssignments(classId),
        getClassAnalytics(classId)
      ]);
      if (!mounted) return;
      setClassroom(nextClass);
      setAssignments(nextAssignments);
      setAnalytics(nextAnalytics);
      setLoading(false);
    }
    void load().catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [classId, user]);

  if (loading) {
    return (
      <StudentGate>
        <div className="container-page py-12"><LoadingSkeleton variant="page" /></div>
      </StudentGate>
    );
  }
  if (!classroom) {
    return (
      <StudentGate>
        <div className="container-page py-16">
          <EmptyState icon={LockKeyhole} title="Class unavailable" description="This class is private, archived, or not part of your account." />
        </div>
      </StudentGate>
    );
  }

  return (
    <StudentGate>
      <PageHeader eyebrow="Class" title={classroom.name} description={classroom.description || `Teacher: ${classroom.ownerName}`} />
      <section className="container-page pb-16">
        <div className="mb-6 flex flex-wrap gap-2">
          <Button href={`/classes/${classroom.id}`} variant={tab === "overview" ? "primary" : "secondary"}>Overview</Button>
          <Button href={`/classes/${classroom.id}/assignments`} variant={tab === "assignments" ? "primary" : "secondary"}>Assignments</Button>
          <Button href={`/classes/${classroom.id}/leaderboard`} variant={tab === "leaderboard" ? "primary" : "secondary"}>Leaderboard</Button>
        </div>
        {tab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={<ClipboardIcon />} label="Assignments" value={String(assignments.length)} helper="Published by teacher" />
            <StatCard icon={<BarChart3 className="size-5" />} label="Class accuracy" value={`${analytics?.averageAccuracy ?? 0}%`} helper="Safe class summary" />
            <StatCard icon={<UsersRound className="size-5" />} label="Members" value={String(classroom.memberCount)} helper="Active class roster" />
          </div>
        ) : null}
        {tab === "assignments" ? <AssignmentList assignments={assignments} /> : null}
        {tab === "leaderboard" ? (
          <Card className="p-5">
            <SectionHeader title="Class leaderboard" description="Ranks use class assignment submissions, not the global leaderboard." />
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
        ) : null}
      </section>
    </StudentGate>
  );
}

function ClipboardIcon() {
  return <BookOpen className="size-5" />;
}

function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) {
    return <EmptyState icon={CalendarClock} title="No assignments yet" description="Published assignments from your teacher will appear here." />;
  }
  return (
    <div className="grid gap-3">
      {assignments.map((assignment) => (
        <Card className="p-5" key={assignment.id}>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={assignment.status} />
            <Badge>{assignment.quizTitle}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">{assignment.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Due {formatDate(assignment.dueAt)}</p>
          <Button className="mt-5" href={`/assignments/${assignment.id}`} variant="secondary">Open assignment</Button>
        </Card>
      ))}
    </div>
  );
}

export function AssignmentPage({ assignmentId }: { assignmentId: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<{
    assignment: Assignment;
    submission: AssignmentSubmission | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void getAssignmentForStudent(assignmentId, user.uid)
      .then((result) => {
        if (result) setState({ assignment: result.assignment, submission: result.submission });
      })
      .finally(() => setLoading(false));
  }, [assignmentId, user]);

  const startState = state ? assignmentHref(state.assignment) : "";
  const canStart = useMemo(() => {
    if (!state) return false;
    if (state.submission?.status === "submitted" || state.submission?.status === "late") return false;
    if (state.assignment.status === "closed") return false;
    if (state.assignment.dueAt && new Date(state.assignment.dueAt).getTime() < Date.now() && !state.assignment.allowLateSubmission) return false;
    return true;
  }, [state]);

  if (loading) {
    return (
      <StudentGate>
        <div className="container-page py-12"><LoadingSkeleton variant="page" /></div>
      </StudentGate>
    );
  }
  if (!state) {
    return (
      <StudentGate>
        <div className="container-page py-16">
          <EmptyState icon={LockKeyhole} title="Assignment unavailable" description="This assignment is private, closed, or not assigned to your account." />
        </div>
      </StudentGate>
    );
  }

  return (
    <StudentGate>
      <PageHeader eyebrow="Assignment" title={state.assignment.title} description={state.assignment.instructions || "Complete the quiz assigned by your teacher."} />
      <section className="container-page pb-16">
        <Card className="mx-auto max-w-3xl p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={state.assignment.status} />
            <Badge>{state.assignment.className}</Badge>
            <Badge>{state.assignment.quizTitle}</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Due" value={state.assignment.dueAt ? formatDate(state.assignment.dueAt) : "Open"} helper="Teacher-set due date" />
            <StatCard label="Attempts" value={String(state.assignment.attemptLimit)} helper="Phase 12 limit" />
            <StatCard label="Result" value={state.assignment.showResultsImmediately ? "Shown" : "Hidden"} helper="Teacher visibility setting" />
          </div>
          {state.submission?.attemptId ? (
            <Button className="mt-6" href={`/assignments/${state.assignment.id}/result?attemptId=${state.submission.attemptId}`} variant="secondary">
              View submission
            </Button>
          ) : (
            <Button className="mt-6" disabled={!canStart} href={startState} icon={<BookOpen className="size-4" />}>
              Start assignment
            </Button>
          )}
        </Card>
      </section>
    </StudentGate>
  );
}

export function AssignmentResultPage({ assignmentId }: { assignmentId: string }) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const attemptId = searchParams.get("attemptId");

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void Promise.all([
      getAssignment(assignmentId),
      getAssignmentSubmission(assignmentId, user.uid),
      attemptId ? getAttempt(attemptId) : Promise.resolve(null)
    ]).then(([nextAssignment, nextSubmission, nextAttempt]) => {
      setAssignment(nextAssignment);
      setSubmission(nextSubmission);
      setAttempt(nextAttempt);
    });
  }, [assignmentId, attemptId, user]);

  return (
    <StudentGate>
      <PageHeader eyebrow="Assignment result" title={assignment?.title ?? "Submission"} description="Your private assignment submission summary." />
      <section className="container-page pb-16">
        <Card className="mx-auto max-w-3xl p-6">
          {submission ? (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={submission.status} />
                <Badge>{assignment?.className}</Badge>
              </div>
              <h2 className="mt-4 text-4xl font-semibold">{submission.score}/{submission.totalPoints}</h2>
              <p className="mt-2 text-muted-foreground">{submission.accuracy}% accuracy • submitted {formatDate(submission.submittedAt)}</p>
              {assignment?.showResultsImmediately && attempt ? (
                <Button className="mt-6" href={`/result/${attempt.id}`} variant="secondary">Review answers</Button>
              ) : (
                <p className="mt-6 rounded-3xl border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
                  Detailed review is hidden until your teacher releases results.
                </p>
              )}
            </>
          ) : (
            <EmptyState icon={CheckCircle2} title="No submission yet" description="Complete the assignment to see your result here." />
          )}
        </Card>
      </section>
    </StudentGate>
  );
}
