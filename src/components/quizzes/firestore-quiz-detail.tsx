"use client";

import { AlertTriangle, Clock3, Copy, Database, Lock, PlayCircle, Share2, Sparkles, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { QuizLeaderboardPreview } from "@/components/leaderboard/quiz-leaderboard-preview";
import { QuizCard } from "@/components/quizzes/quiz-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { createChallengeForQuiz } from "@/lib/firestore/challenges";
import { getPublicQuizBySlug, listPublicQuizzesByCategory } from "@/lib/firestore/content";
import { createReport } from "@/lib/firestore/reports";
import { sampleQuizzes } from "@/data/sample-data";
import { formatNumber, formatSeconds, titleCase } from "@/lib/utils";
import type { Quiz, QuizCardItem } from "@/types/domain";

export function FirestoreQuizDetail({
  slug,
  initialQuiz,
  initialRelated = []
}: {
  slug: string;
  initialQuiz?: Quiz | QuizCardItem | null;
  initialRelated?: QuizCardItem[];
}) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | QuizCardItem | null>(initialQuiz ?? null);
  const [related, setRelated] = useState<QuizCardItem[]>(initialRelated);
  const [loading, setLoading] = useState(!initialQuiz);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [challengeWorking, setChallengeWorking] = useState(false);
  const [reportWorking, setReportWorking] = useState(false);

  useEffect(() => {
    if (initialQuiz) return;

    async function load() {
      if (!isFirebaseConfigured) {
        const fallback = sampleQuizzes.find((item) => item.slug === slug) ?? null;
        setQuiz(fallback);
        setRelated(sampleQuizzes.filter((item) => item.slug !== slug).slice(0, 3));
        setSetupMode(true);
        setLoading(false);
        return;
      }

      try {
        const nextQuiz = await getPublicQuizBySlug(slug);
        setQuiz(nextQuiz);
        if (nextQuiz) {
          const nextRelated = await listPublicQuizzesByCategory(nextQuiz.categoryId);
          setRelated(nextRelated.filter((item) => item.slug !== slug).slice(0, 3));
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load this quiz.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [initialQuiz, slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={AlertTriangle} title="Quiz could not load" description={error} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Quiz is not published"
          description="This quiz is missing, archived, private, or still in draft. Only published public quizzes are available here."
          actionHref="/quizzes"
          actionLabel="Browse published quizzes"
        />
      </div>
    );
  }

  const categoryName = quiz.categoryName;
  const timeLimitSeconds = "timeLimitSeconds" in quiz ? quiz.timeLimitSeconds : quiz.timeLimitSeconds;
  const totalPoints = quiz.totalPoints ?? 0;
  const canStart = Boolean(!setupMode && quiz.id && quiz.questionCount > 0);
  const startDisabledReason = setupMode
    ? "Configure Firebase to play"
    : quiz.questionCount <= 0
      ? "Add active questions first"
      : "Start Quiz";

  async function createChallenge() {
    if (!quiz?.id || !user || challengeWorking) return;
    setChallengeWorking(true);
    try {
      const challenge = await createChallengeForQuiz({
        user,
        profile,
        quizId: quiz.id,
        quizTitle: quiz.title
      });
      const link = `${window.location.origin}/rooms/challenge/${challenge.challengeId}`;
      await navigator.clipboard.writeText(link);
      showToast({
        tone: "success",
        title: "Challenge link created",
        description: `Room ${challenge.roomCode} is ready; invite link copied.`
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

  async function shareQuiz() {
    if (!quiz) return;
    const link = `${window.location.origin}/quizzes/${quiz.slug}`;
    const text = `Try this Quizora quiz: ${quiz.title}`;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: quiz.title, text, url: link });
      } else {
        await navigator.clipboard.writeText(`${text} ${link}`);
      }
      showToast({
        tone: "success",
        title: "Quiz link ready",
        description:
          typeof navigator.share === "function"
            ? "Share sheet opened."
            : "Quiz link copied to clipboard."
      });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      showToast({
        tone: "error",
        title: "Could not share quiz",
        description: "Try copying the browser URL instead."
      });
    }
  }

  async function reportQuiz() {
    if (!quiz || !user || reportWorking) return;
    setReportWorking(true);
    try {
      await createReport({
        type: "quiz",
        targetId: quiz.id ?? quiz.slug,
        targetLabel: quiz.title,
        targetUrl: `/quizzes/${quiz.slug}`,
        reportedBy: user.uid,
        reportedByName: profile?.displayName ?? user.displayName ?? "Quizora Player",
        reason: "Quiz content review",
        details: `A player requested admin review for ${quiz.title}.`
      });
      showToast({
        tone: "success",
        title: "Report sent",
        description: "Admins can review this quiz from the reports queue."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Report failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setReportWorking(false);
    }
  }

  return (
    <>
      {setupMode ? (
        <section className="container-page pt-8">
          <EmptyState
            icon={Database}
            title="Firebase is not configured yet"
            description={`${firebaseSetupMessage} Showing a sample detail page so the UI remains reviewable.`}
          />
        </section>
      ) : null}
      <section className="relative overflow-hidden py-10 sm:py-14">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            "accent" in quiz && quiz.accent ? quiz.accent : "from-amber-200 via-stone-100 to-sky-100"
          } opacity-70 dark:opacity-15`}
        />
        <div className="absolute inset-0 premium-grid opacity-45" />
        <div className="container-page relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="text-primary">{categoryName}</Badge>
              <StatusBadge value={quiz.difficulty}>{titleCase(quiz.difficulty)}</StatusBadge>
              {quiz.isFeatured ? <StatusBadge value="featured">Featured</StatusBadge> : null}
              {quiz.isDailyChallenge ? <StatusBadge value="daily">Daily challenge</StatusBadge> : null}
            </div>
            <h1 className="text-balance text-4xl font-semibold sm:text-6xl">
              {quiz.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {quiz.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Badge>{quiz.questionCount} questions</Badge>
              <Badge>{quiz.estimatedMinutes} minutes</Badge>
              <Badge>{formatSeconds(timeLimitSeconds)}</Badge>
              <Badge>{totalPoints} points</Badge>
              <Badge>{formatNumber(quiz.playCount)} plays</Badge>
            </div>
            {quiz.tags?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {quiz.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            ) : null}
          </div>
          <Card className="p-5">
            <p className="text-sm font-semibold uppercase text-primary">Play ready</p>
            <h2 className="mt-2 text-2xl font-semibold">Start the real quiz engine</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Quizora saves a private attempt, calculates your score, awards XP,
              and unlocks the answer review after final submission.
            </p>
            {canStart ? (
              <div className="mt-5 grid gap-3">
                <Button fullWidth href={`/play/${quiz.id}`} icon={<PlayCircle className="size-4" />}>
                  Start Quiz
                </Button>
                {user ? (
                  <Button
                    disabled={challengeWorking}
                    fullWidth
                    icon={<Swords className="size-4" />}
                    onClick={() => void createChallenge()}
                    variant="secondary"
                  >
                    Challenge Friends
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    href={`/login?next=${encodeURIComponent(`/quizzes/${slug}`)}`}
                    icon={<Swords className="size-4" />}
                    variant="secondary"
                  >
                    Sign in to Challenge
                  </Button>
                )}
                <Button
                  fullWidth
                  icon={<Share2 className="size-4" />}
                  onClick={() => void shareQuiz()}
                  variant="ghost"
                >
                  Share Quiz
                </Button>
                {user ? (
                  <Button
                    disabled={reportWorking}
                    fullWidth
                    onClick={() => void reportQuiz()}
                    variant="ghost"
                  >
                    Report Quiz
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <Button disabled fullWidth icon={<Lock className="size-4" />}>
                  {startDisabledReason}
                </Button>
                <Button
                  fullWidth
                  icon={<Copy className="size-4" />}
                  onClick={() => void shareQuiz()}
                  variant="secondary"
                >
                  Copy Quiz Link
                </Button>
              </div>
            )}
          </Card>
        </div>
      </section>

      <section className="container-page grid gap-6 py-12 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-6">
          <Card className="p-6">
            <SectionHeader
              className="mb-5"
              eyebrow="Rules"
              title="Before you begin"
              description="Public detail uses safe quiz metadata only. Correct answers unlock after your saved result review."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Clock3, label: "Estimated time", value: `${quiz.estimatedMinutes} min` },
                { icon: PlayCircle, label: "Questions", value: `${quiz.questionCount}` },
                { icon: Sparkles, label: "Points", value: `${totalPoints}` }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="rounded-3xl border border-border bg-surface/70 p-4"
                    key={item.label}
                  >
                    <Icon className="size-5 text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Trophy className="size-6" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Scoring is intentionally offline</h2>
                <p className="mt-2 text-muted-foreground">
                  Leaderboards are casual validation surfaces today. Prize-grade
                  ranking still needs trusted server scoring and anti-cheat hardening.
                </p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="h-fit p-6">
          <h2 className="text-2xl font-semibold">Public safety</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-muted-foreground">
            <li>Only published public quizzes are visible.</li>
            <li>Correct answers are not fetched on this page.</li>
            <li>Play is login-required so attempts and XP can be saved.</li>
          </ul>
        </Card>
        {!setupMode && quiz.id ? <QuizLeaderboardPreview quizId={quiz.id} /> : null}
      </section>

      {related.length ? (
        <section className="container-page pb-16">
          <SectionHeader title="Related published quizzes" />
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <QuizCard key={item.id ?? item.slug} quiz={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
