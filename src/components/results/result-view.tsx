"use client";

import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Flame,
  LockKeyhole,
  RotateCcw,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";
import { getAttemptForViewer } from "@/lib/firestore/attempts";
import { createChallengeForQuiz } from "@/lib/firestore/challenges";
import { getCurrentUserRank } from "@/lib/firestore/leaderboards";
import { createReport } from "@/lib/firestore/reports";
import { performanceMessage } from "@/lib/quiz/result-copy";
import { getLevelProgress } from "@/lib/quiz/xp";
import { cn, formatSeconds, titleCase } from "@/lib/utils";
import type { Attempt, AttemptAnswer, LeaderboardEntry } from "@/types/domain";

function answerIsSkipped(answer: AttemptAnswer) {
  return !answer.selectedAnswer && answer.selectedAnswers.length === 0;
}

function optionLabel(answer: AttemptAnswer, optionId: string) {
  return answer.optionsSnapshot.find((option) => option.id === optionId)?.text || optionId;
}

function selectedAnswerText(answer: AttemptAnswer) {
  if (answer.selectedAnswers.length) {
    return answer.selectedAnswers.map((id) => optionLabel(answer, id)).join(", ");
  }

  if (answer.selectedAnswer) {
    return optionLabel(answer, answer.selectedAnswer);
  }

  return "Skipped";
}

function correctAnswerText(answer: AttemptAnswer) {
  if (answer.correctAnswers.length) {
    return answer.correctAnswers.map((id) => optionLabel(answer, id)).join(", ");
  }

  return answer.correctAnswer ? optionLabel(answer, answer.correctAnswer) : "Manual review";
}

export function ResultView({ attemptId }: { attemptId: string }) {
  const { showToast } = useToast();
  const {
    user,
    profile,
    loading: authLoading,
    authReady
  } = useAuth();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [rank, setRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [challengeWorking, setChallengeWorking] = useState(false);
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || authLoading || !user) {
      setLoading(false);
      return;
    }

    const currentUser = user;
    let mounted = true;
    setLoading(true);
    setError(null);
    setForbidden(false);

    async function loadAttempt() {
      try {
        const result = await getAttemptForViewer(
          attemptId,
          currentUser.uid,
          hasAdminAccess({ email: currentUser.email, profile })
        );

        if (!mounted) return;

        if (result === "forbidden") {
          setForbidden(true);
          setAttempt(null);
          return;
        }

        setAttempt(result);
      } catch (caught) {
        if (!mounted) return;
        const message =
          caught instanceof Error ? caught.message : "Could not load this result.";
        if (message.toLowerCase().includes("permission")) {
          setForbidden(true);
        } else {
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAttempt();

    return () => {
      mounted = false;
    };
  }, [attemptId, authLoading, authReady, profile, user]);

  useEffect(() => {
    if (!attempt) return;

    const currentAttempt = attempt;
    let mounted = true;
    async function loadRank() {
      try {
        const nextRank = await getCurrentUserRank(
          {
            scope: "quiz",
            scopeId: currentAttempt.quizId,
            periodType: "all-time",
            limit: 50
          },
          currentAttempt.userId
        );
        if (mounted) setRank(nextRank);
      } catch {
        if (mounted) setRank(null);
      }
    }

    void loadRank();

    return () => {
      mounted = false;
    };
  }, [attempt]);

  const scorePercent = useMemo(() => {
    if (!attempt?.totalPoints) return 0;
    return Math.round((attempt.score / attempt.totalPoints) * 100);
  }, [attempt]);

  const levelProgress = useMemo(() => {
    if (!attempt) return null;
    const xpTotal = attempt.userId === user?.uid ? profile?.xp ?? attempt.xpEarned : attempt.xpEarned;
    return getLevelProgress(xpTotal);
  }, [attempt, profile?.xp, user?.uid]);

  async function shareResult() {
    if (!attempt || sharing) return;
    setSharing(true);
    const text = `I scored ${attempt.score}/${attempt.totalPoints} on ${attempt.quizTitle} with ${attempt.accuracy}% accuracy on Quizora. Can you beat me?`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/quizzes/${attempt.quizSlug}`
        : "";
    const canNativeShare = "share" in navigator;

    try {
      if (canNativeShare) {
        await navigator.share({ title: "Quizora result", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
      showToast({
        tone: "success",
        title: "Share text ready",
        description: canNativeShare
          ? "Your result summary was shared with the public quiz link."
          : "Result summary and public quiz link copied to clipboard."
      });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      showToast({
        tone: "error",
        title: "Could not share result",
        description: "Try copying from the page again."
      });
    } finally {
      setSharing(false);
    }
  }

  async function createChallenge() {
    if (!attempt || !user || challengeWorking) return;
    setChallengeWorking(true);
    try {
      const challenge = await createChallengeForQuiz({
        user,
        profile,
        quizId: attempt.quizId,
        quizTitle: attempt.quizTitle
      });
      const link = `${window.location.origin}/rooms/challenge/${challenge.challengeId}`;
      await navigator.clipboard.writeText(link);
      showToast({
        tone: "success",
        title: "Challenge link created",
        description: `Room ${challenge.roomCode} is ready; link copied.`
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Challenge was not created",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setChallengeWorking(false);
    }
  }

  async function reportQuestion(answer: AttemptAnswer) {
    if (!attempt || !user || reportingQuestionId) return;
    setReportingQuestionId(answer.questionId);
    try {
      await createReport({
        type: "question",
        targetId: answer.questionId,
        targetLabel: answer.questionTextSnapshot,
        targetUrl: `/result/${attempt.id}`,
        reportedBy: user.uid,
        reportedByName: profile?.displayName ?? user.displayName ?? "Quizora Player",
        reason: "Question quality review",
        details: `Question reported from result review for ${attempt.quizTitle}.`
      });
      showToast({
        tone: "success",
        title: "Question report sent",
        description: "Admins can review it from the reports queue."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Report failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setReportingQuestionId(null);
    }
  }

  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={LockKeyhole}
          title="Firebase setup is required"
          description={firebaseSetupMessage}
        />
      </div>
    );
  }

  if (authLoading || loading) {
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
          icon={LockKeyhole}
          title="Sign in to view this result"
          description="Quizora results are private to the player account that completed the attempt."
          actionHref={`/login?next=${encodeURIComponent(`/result/${attemptId}`)}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={LockKeyhole}
          title="Result access denied"
          description="This attempt belongs to another user. Admins can review attempts from the admin studio."
          actionHref="/dashboard"
          actionLabel="Back to dashboard"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={AlertTriangle} title="Result could not load" description={error} />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Result not found"
          description="This attempt is missing or no longer available."
          actionHref="/dashboard"
          actionLabel="Back to dashboard"
        />
      </div>
    );
  }

  const stats = [
    {
      label: "Accuracy",
      value: `${attempt.accuracy}%`,
      helper: `${attempt.correctCount} correct of ${attempt.totalQuestions}`,
      icon: <CheckCircle2 className="size-5" />
    },
    {
      label: "Wrong",
      value: String(attempt.wrongCount),
      helper: "Review these explanations first",
      icon: <XCircle className="size-5" />
    },
    {
      label: "Skipped",
      value: String(attempt.skippedCount),
      helper: "Skipped questions earned 0 points",
      icon: <BarChart3 className="size-5" />
    },
    {
      label: "Time",
      value: formatSeconds(attempt.timeTakenSeconds),
      helper: "Saved with the attempt snapshot",
      icon: <Clock3 className="size-5" />
    }
  ];

  return (
    <div className="container-page space-y-10 py-8 sm:py-10">
      <section className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-stretch">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Card className="relative h-full overflow-hidden p-7">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-80 dark:opacity-15" />
            <div className="relative">
              <div className="flex flex-wrap gap-2">
                <Badge className="text-primary">{attempt.categoryName}</Badge>
                <StatusBadge value={attempt.difficulty}>
                  {titleCase(attempt.difficulty)}
                </StatusBadge>
                <Badge className={attempt.trusted ? "text-success" : "text-warning"}>
                  {attempt.trusted ? "Result verified" : "Legacy scoring"}
                </Badge>
                {attempt.reviewStatus === "flagged" ? <Badge className="text-warning">Under review</Badge> : null}
                <Badge>{rank?.rank ? `Rank #${rank.rank}` : "Rank pending"}</Badge>
              </div>
              <h1 className="mt-6 text-balance text-4xl font-semibold sm:text-5xl">
                {attempt.quizTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-muted-foreground">
                {performanceMessage(attempt.accuracy)}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={`/play/${attempt.quizId}`} icon={<RotateCcw className="size-4" />}>
                  Retry quiz
                </Button>
                <Button href="/quizzes" variant="secondary">
                  Back to quizzes
                </Button>
                <Button
                  disabled={sharing}
                  icon={sharing ? <Copy className="size-4" /> : <Share2 className="size-4" />}
                  onClick={() => void shareResult()}
                  variant="ghost"
                >
                  {sharing ? "Sharing" : "Share result"}
                </Button>
                <Button
                  disabled={challengeWorking}
                  icon={<Swords className="size-4" />}
                  onClick={() => void createChallenge()}
                  variant="ghost"
                >
                  Challenge friends
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card className="flex flex-col items-center justify-center p-7 text-center">
          <div
            className="flex size-44 items-center justify-center rounded-full p-3"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${scorePercent * 3.6}deg, hsl(var(--muted)) 0deg)`
            }}
          >
            <div className="flex size-full flex-col items-center justify-center rounded-full bg-surface shadow-inner">
              <Sparkles className="size-7 text-primary" />
              <p className="mt-2 text-5xl font-semibold">{scorePercent}%</p>
              <p className="text-sm text-muted-foreground">score</p>
            </div>
          </div>
          <p className="mt-5 text-2xl font-semibold">
            {attempt.score} / {attempt.totalPoints} points
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            +{attempt.xpEarned} XP earned
          </p>
          {attempt.levelAfter > attempt.levelBefore ? (
            <Badge className="mt-4 border-primary/20 bg-primary/10 text-primary">
              Level up to {attempt.levelAfter}
            </Badge>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            helper={stat.helper}
            icon={stat.icon}
            key={stat.label}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <Card className="p-5">
          <Award className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">Personal best</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {attempt.personalBestStatus === "first"
              ? "First saved score for this quiz."
              : attempt.personalBestStatus === "new-best"
                ? `New best by ${attempt.personalBestDelta} points.`
                : attempt.personalBestStatus === "matched"
                  ? "Matched your previous best."
                  : `Below best by ${Math.abs(attempt.personalBestDelta)} points.`}
          </p>
        </Card>
        <Card className="p-5">
          <Flame className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">{attempt.streakAfter} day streak</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Daily streaks update once per local day after completed attempts.
          </p>
        </Card>
        <Card className="p-5">
          <BarChart3 className="size-7 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">
            {rank?.rank ? `Rank #${rank.rank}` : "Leaderboard pending"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {attempt.leaderboardUpdated
              ? "This attempt updated leaderboard entries."
              : "Attempt saved; leaderboard rebuild can recover entries if needed."}
          </p>
        </Card>
      </section>

      {levelProgress ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Level progress</p>
              <h2 className="mt-2 text-2xl font-semibold">Level {levelProgress.currentLevel}</h2>
            </div>
            <Badge>{levelProgress.xpToNextLevel} XP to next level</Badge>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${levelProgress.levelProgressPercent}%` }}
            />
          </div>
        </Card>
      ) : null}

      {attempt.badgeUnlocks.length ? (
        <section>
          <SectionHeader
            className="mb-5"
            eyebrow="Badges"
            title="Newly unlocked"
            description="Badges are stored on your profile after completed attempts."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {attempt.badgeUnlocks.map((badge) => (
              <Card className="p-5" key={badge.id}>
                <Award className="size-7 text-primary" />
                <Badge className="mt-4">{badge.rarity}</Badge>
                <h3 className="mt-3 text-xl font-semibold">{badge.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{badge.description}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          className="mb-5"
          eyebrow="Review"
          title="Answer review"
          description="This review uses saved attempt snapshots, so it remains accurate even if admins edit questions later."
        />
        <div className="grid gap-4">
          {attempt.answers.map((answer, index) => {
            const skipped = answerIsSkipped(answer);
            const tone = skipped ? "skipped" : answer.isCorrect ? "correct" : "incorrect";
            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 10 }}
                key={answer.questionId}
                transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
              >
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <StatusBadge value={tone}>
                        {skipped ? "Skipped" : answer.isCorrect ? "Correct" : "Incorrect"}
                      </StatusBadge>
                      <h2 className="mt-3 text-xl font-semibold">
                        {index + 1}. {answer.questionTextSnapshot}
                      </h2>
                    </div>
                    <Badge>
                      {answer.pointsEarned} / {answer.pointsPossible} pts
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Button
                      disabled={reportingQuestionId === answer.questionId}
                      onClick={() => void reportQuestion(answer)}
                      size="sm"
                      variant="secondary"
                    >
                      Report question
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-surface/70 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Your answer
                      </p>
                      <p className="mt-2 font-semibold">{selectedAnswerText(answer)}</p>
                    </div>
                    <div className="rounded-3xl border border-success/20 bg-success/10 p-4 text-success">
                      <p className="text-xs font-semibold uppercase opacity-80">
                        Correct answer
                      </p>
                      <p className="mt-2 font-semibold">{correctAnswerText(answer)}</p>
                    </div>
                  </div>

                  {answer.optionsSnapshot.length ? (
                    <div className="mt-4 grid gap-2">
                      {answer.optionsSnapshot.map((option) => {
                        const selected =
                          answer.selectedAnswer === option.id ||
                          answer.selectedAnswers.includes(option.id);
                        const correct =
                          answer.correctAnswer === option.id ||
                          answer.correctAnswers.includes(option.id);

                        return (
                          <div
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm",
                              correct && "border-success/30 bg-success/10 text-success",
                              selected && !correct && "border-danger/30 bg-danger/10 text-danger"
                            )}
                            key={option.id}
                          >
                            <span>{option.text}</span>
                            <span className="text-xs font-semibold">
                              {correct ? "Correct" : selected ? "Selected" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {answer.explanationSnapshot ? (
                    <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-primary">
                      <Trophy className="mb-2 size-4" />
                      {answer.explanationSnapshot}
                    </div>
                  ) : null}
                </Card>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
