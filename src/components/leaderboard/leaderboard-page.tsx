"use client";

import { AlertTriangle, Crown, Database, Medal, Search, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicCategories, listPublicQuizzes } from "@/lib/firestore/content";
import { getCurrentUserRank, getLeaderboard } from "@/lib/firestore/leaderboards";
import { periodLabel } from "@/lib/quiz/periods";
import { cn, formatNumber, formatSeconds } from "@/lib/utils";
import type {
  Category,
  LeaderboardEntry,
  LeaderboardScope,
  PeriodType,
  Quiz
} from "@/types/domain";

const scopes: Array<{ value: LeaderboardScope; label: string }> = [
  { value: "global", label: "Global" },
  { value: "quiz", label: "Quiz" },
  { value: "category", label: "Category" }
];

const periods: Array<{ value: PeriodType; label: string }> = [
  { value: "all-time", label: "All-time" },
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" }
];

function formatDate(value: string | null) {
  if (!value) return "Recent";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

function scopeLabel(scope: LeaderboardScope) {
  if (scope === "quiz") return "Quiz leaderboard";
  if (scope === "category") return "Category leaderboard";
  return "Global leaderboard";
}

function podiumConfig(index: number) {
  if (index === 0) {
    return {
      label: "Champion",
      className: "lg:order-2 lg:-translate-y-5",
      icon: Crown,
      tone: "from-amber-200 via-stone-100 to-yellow-100"
    };
  }
  if (index === 1) {
    return {
      label: "Second",
      className: "lg:order-1 lg:translate-y-5",
      icon: Medal,
      tone: "from-slate-100 via-stone-100 to-sky-100"
    };
  }
  return {
    label: "Third",
    className: "lg:order-3 lg:translate-y-8",
    icon: Medal,
    tone: "from-orange-100 via-stone-100 to-amber-100"
  };
}

export function LeaderboardPageClient() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  const initialScope = (searchParams.get("scope") as LeaderboardScope | null) ?? "global";
  const [scope, setScope] = useState<LeaderboardScope>(
    initialScope === "quiz" || initialScope === "category" ? initialScope : "global"
  );
  const [periodType, setPeriodType] = useState<PeriodType>("all-time");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizId, setQuizId] = useState(searchParams.get("quizId") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentRank, setCurrentRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      if (!isFirebaseConfigured) {
        setMetaLoading(false);
        return;
      }

      try {
        const [nextQuizzes, nextCategories] = await Promise.all([
          listPublicQuizzes(),
          listPublicCategories()
        ]);
        setQuizzes(nextQuizzes);
        setCategories(nextCategories);
        if (!quizId && nextQuizzes[0]?.id) setQuizId(nextQuizzes[0].id);
        if (!categoryId && nextCategories[0]?.id) setCategoryId(nextCategories[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load filters.");
      } finally {
        setMetaLoading(false);
      }
    }

    void loadMeta();
  }, [categoryId, quizId]);

  const scopeId = scope === "global" ? "all" : scope === "quiz" ? quizId : categoryId;

  useEffect(() => {
    async function loadLeaderboard() {
      if (!isFirebaseConfigured || metaLoading) {
        setLoading(false);
        return;
      }

      if (scope !== "global" && !scopeId) {
        setEntries([]);
        setCurrentRank(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const query = {
          scope,
          scopeId,
          periodType,
          limit: 25
        };
        const [leaderboard, rank] = await Promise.all([
          getLeaderboard(query),
          user ? getCurrentUserRank(query, user.uid) : Promise.resolve(null)
        ]);
        setEntries(leaderboard.entries);
        setCurrentRank(rank);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, [metaLoading, periodType, scope, scopeId, user]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const selectedLabel = useMemo(() => {
    if (scope === "quiz") {
      return quizzes.find((quiz) => quiz.id === quizId)?.title ?? "Choose a quiz";
    }
    if (scope === "category") {
      return categories.find((category) => category.id === categoryId)?.name ?? "Choose a category";
    }
    return "All Quizora";
  }, [categories, categoryId, quizId, quizzes, scope]);

  return (
    <>
      <PageHeader
        eyebrow="Leaderboard"
        title="Climb the Quizora ranks"
        description="Real rankings are derived from completed attempts, best quiz performances, and period-based leaderboard entries."
      />
      <section className="container-page space-y-8 pb-16">
        {!isFirebaseConfigured ? (
          <EmptyState
            icon={Database}
            title="Firebase setup is required"
            description={firebaseSetupMessage}
          />
        ) : null}

        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem_1fr]">
            <div className="grid grid-cols-3 gap-2">
              {scopes.map((item) => (
                <button
                  className={cn(
                    "rounded-2xl border border-border bg-surface/70 px-3 py-3 text-sm font-semibold transition hover:bg-primary/10",
                    scope === item.value && "border-primary/40 bg-primary/12 text-primary"
                  )}
                  key={item.value}
                  onClick={() => setScope(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Select
              aria-label="Leaderboard period"
              onChange={(event) => setPeriodType(event.target.value as PeriodType)}
              value={periodType}
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </Select>
            {scope === "quiz" ? (
              <Select
                aria-label="Quiz leaderboard"
                onChange={(event) => setQuizId(event.target.value)}
                value={quizId}
              >
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </Select>
            ) : scope === "category" ? (
              <Select
                aria-label="Category leaderboard"
                onChange={(event) => setCategoryId(event.target.value)}
                value={categoryId}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 text-sm font-semibold text-muted-foreground">
                <Search className="size-4" />
                Global performance points
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card className="p-5">
            <p className="text-sm font-semibold uppercase text-primary">
              {scopeLabel(scope)}
            </p>
            <h2 className="mt-2 text-3xl font-semibold">{selectedLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Showing {periodLabel(periodType).toLowerCase()} rankings. Ties sort by
              score, accuracy, speed, and earliest completion.
            </p>
          </Card>
          <Card className="p-5">
            <Trophy className="size-7 text-primary" />
            <h2 className="mt-3 text-2xl font-semibold">Your pinned rank</h2>
            {currentRank ? (
              <div className="mt-4">
                <p className="text-4xl font-semibold">
                  {currentRank.rank ? `#${currentRank.rank}` : "Outside top 50"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatNumber(currentRank.score)} points • {currentRank.accuracy}% accuracy
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Play a published quiz to enter this leaderboard.
              </p>
            )}
          </Card>
        </div>

        {loading || metaLoading ? <LoadingSkeleton variant="page" /> : null}

        {error ? (
          <EmptyState icon={AlertTriangle} title="Leaderboard could not load" description={error} />
        ) : null}

        {!loading && !error && podium.length ? (
          <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
            {podium.map((entry, index) => {
              const config = podiumConfig(index);
              const Icon = config.icon;
              return (
                <motion.article
                  animate={{ opacity: 1, y: 0 }}
                  className={config.className}
                  initial={{ opacity: 0, y: 18 }}
                  key={entry.id}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                >
                  <Card className="relative overflow-hidden p-6 text-center">
                    <div
                      className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${config.tone} opacity-80 dark:opacity-15`}
                    />
                    <div className="relative">
                      <UserAvatar
                        className="mx-auto"
                        name={entry.userDisplayName}
                        size="lg"
                        src={entry.userPhotoURL}
                      />
                      <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Icon className="size-6" />
                      </span>
                      <p className="mt-4 text-sm font-semibold uppercase text-primary">
                        {config.label}
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold">{entry.userDisplayName}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {scope === "global" ? entry.quizTitle : entry.categoryName}
                      </p>
                      <p className="mt-4 text-4xl font-semibold">{formatNumber(entry.score)}</p>
                      <Badge className="mt-4">{entry.accuracy}% accuracy</Badge>
                    </div>
                  </Card>
                </motion.article>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && entries.length ? (
          <Card className="overflow-hidden">
            <div className="border-b border-border/70 p-5">
              <h2 className="text-2xl font-semibold">Rankings</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Public leaderboard rows do not expose private attempt review data.
              </p>
            </div>
            <div className="grid gap-3 p-4">
              {[...podium, ...rest].map((entry) => {
                const canViewResult = Boolean(
                  user && (entry.userId === user.uid || adminOverride)
                );
                return (
                  <div
                    className="grid gap-4 rounded-3xl border border-border bg-surface/70 p-4 md:grid-cols-[4rem_1fr_auto] md:items-center"
                    key={entry.id}
                  >
                    <div className="text-2xl font-semibold text-primary">#{entry.rank}</div>
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        name={entry.userDisplayName}
                        size="md"
                        src={entry.userPhotoURL}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{entry.userDisplayName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {entry.quizTitle} • {entry.categoryName}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Badge>{formatNumber(entry.score)} pts</Badge>
                      <Badge>{entry.accuracy}%</Badge>
                      <Badge>{formatSeconds(entry.timeTakenSeconds)}</Badge>
                      <Badge>{formatDate(entry.completedAt)}</Badge>
                      {canViewResult ? (
                        <Button href={`/result/${entry.attemptId}`} size="sm" variant="secondary">
                          Result
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {!loading && !error && !entries.length && isFirebaseConfigured ? (
          <EmptyState
            icon={Trophy}
            title="No leaderboard entries yet"
            description="Complete a published quiz to create the first leaderboard entry for this filter."
            actionHref="/quizzes"
            actionLabel="Browse quizzes"
          />
        ) : null}
      </section>
    </>
  );
}
