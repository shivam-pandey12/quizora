"use client";

import { Bot, Database, Loader2, LockKeyhole, RadioTower, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicQuizzes } from "@/lib/firestore/content";
import { startQuickMatch } from "@/lib/firestore/matchmaking";
import type { MatchmakingPlayerCount, QuickMatchPreferences, Quiz, QuizDifficulty, RoomScoringMode } from "@/types/domain";

const defaultPreferences: QuickMatchPreferences = {
  preferredQuizId: "",
  preferredCategoryId: "",
  preferredDifficulty: "any",
  preferredPlayerCount: 2,
  allowBotFill: true,
  questionTimerSeconds: 30,
  scoringMode: "standard"
};

export function QuickMatchPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, loading, authReady } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [preferences, setPreferences] = useState<QuickMatchPreferences>(defaultPreferences);
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured || !user) {
      setQuizzesLoading(false);
      return;
    }

    async function loadQuizzes() {
      setQuizzesLoading(true);
      try {
        const nextQuizzes = await listPublicQuizzes();
        if (mounted) setQuizzes(nextQuizzes.filter((quiz) => quiz.questionCount > 0));
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load playable quizzes.");
      } finally {
        if (mounted) setQuizzesLoading(false);
      }
    }

    void loadQuizzes();
    return () => {
      mounted = false;
    };
  }, [user]);

  const categories = useMemo(
    () => Array.from(new Map(quizzes.map((quiz) => [quiz.categoryId, quiz.categoryName])).entries()),
    [quizzes]
  );
  const filteredQuizzes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return quizzes.filter(
      (quiz) =>
        !normalized ||
        [quiz.title, quiz.categoryName, quiz.difficulty].some((value) =>
          value.toLowerCase().includes(normalized)
        )
    );
  }, [quizzes, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || working) return;
    setWorking(true);
    setError(null);
    try {
      const result = await startQuickMatch({ user, profile, preferences });
      showToast({
        tone: "success",
        title: result.createdRoom ? "Matchmaking room created" : "Matched into a room",
        description: `Room ${result.roomCode} is ready.`
      });
      router.push(`/matchmaking/status?room=${encodeURIComponent(result.roomCode)}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start Quick Match.";
      setError(message);
      showToast({ tone: "error", title: "Quick Match failed", description: message });
    } finally {
      setWorking(false);
    }
  }

  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Database} title="Firebase setup is required" description={firebaseSetupMessage} />
      </div>
    );
  }

  if (loading || quizzesLoading) {
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
          title="Sign in to start Quick Match"
          description="Matchmaking is login-required so rooms, bots, and live-room results stay tied to real profile identity."
          actionHref={`/login?next=${encodeURIComponent("/matchmaking/quick")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (!quizzes.length) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={RadioTower}
          title="No playable quizzes yet"
          description="Publish a quiz with active questions before Quick Match can create live rooms."
          actionHref="/quizzes"
          actionLabel="Browse quizzes"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Quick Match"
        title="Tune your match preferences"
        description="Search compatible quick rooms first; if none are open, Quizora creates a public matchmaking room for you."
      />
      <section className="container-page pb-16">
        <form className="grid gap-6 lg:grid-cols-[1fr_24rem]" onSubmit={submit}>
          <Card className="p-5">
            <Search className="size-8 text-primary" />
            <h2 className="mt-3 text-2xl font-semibold">Match preferences</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Quiz</span>
                <Select
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, preferredQuizId: event.target.value }))
                  }
                  value={preferences.preferredQuizId}
                >
                  <option value="">Any published quiz</option>
                  {filteredQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title} ({quiz.questionCount} questions)
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Search quiz list</span>
                <Input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by title, category, or difficulty"
                  value={search}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Category</span>
                  <Select
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, preferredCategoryId: event.target.value }))
                    }
                    value={preferences.preferredCategoryId}
                  >
                    <option value="">Any category</option>
                    {categories.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Difficulty</span>
                  <Select
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        preferredDifficulty: event.target.value as QuizDifficulty | "any"
                      }))
                    }
                    value={preferences.preferredDifficulty}
                  >
                    <option value="any">Any difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </Select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Players</span>
                  <Select
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        preferredPlayerCount:
                          event.target.value === "flexible"
                            ? "flexible"
                            : (Number(event.target.value) as MatchmakingPlayerCount)
                      }))
                    }
                    value={String(preferences.preferredPlayerCount)}
                  >
                    <option value="2">2 players</option>
                    <option value="3">3 players</option>
                    <option value="4">4 players</option>
                    <option value="flexible">Flexible</option>
                  </Select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Timer seconds</span>
                  <Input
                    min={10}
                    max={120}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        questionTimerSeconds: Number(event.target.value)
                      }))
                    }
                    type="number"
                    value={preferences.questionTimerSeconds}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Scoring</span>
                  <Select
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        scoringMode: event.target.value as RoomScoringMode
                      }))
                    }
                    value={preferences.scoringMode}
                  >
                    <option value="standard">Standard</option>
                    <option value="speed-bonus">Speed bonus</option>
                  </Select>
                </label>
              </div>
              <Switch
                checked={preferences.allowBotFill}
                description="After the bot-fill countdown, the host can fill missing seats with clearly marked casual bots."
                label="Allow bot fill"
                onCheckedChange={(checked) =>
                  setPreferences((current) => ({ ...current, allowBotFill: checked }))
                }
              />
            </div>
          </Card>

          <Card className="h-fit p-5 lg:sticky lg:top-24">
            <Bot className="size-8 text-primary" />
            <h2 className="mt-3 text-2xl font-semibold">Casual match rules</h2>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <p>Exact quiz rooms are preferred first, then category/difficulty matches, then any compatible quick room.</p>
              <p>Bots are host-assisted and clearly marked. They never create real-user attempts or leaderboard writes.</p>
              <p>Host-controlled start and advancement remain the default for room sync stability.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{preferences.preferredQuizId ? "Specific quiz" : "Any quiz"}</Badge>
              <Badge>{preferences.allowBotFill ? "Bot fill on" : "No bots"}</Badge>
              <Badge>{preferences.scoringMode}</Badge>
            </div>
            {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
            <div className="mt-6 grid gap-3">
              <Button disabled={working} fullWidth type="submit">
                {working ? <Loader2 className="size-4 animate-spin" /> : null}
                Find Match
              </Button>
              <Button fullWidth href="/matchmaking" variant="secondary">
                Back to matchmaking
              </Button>
            </div>
          </Card>
        </form>
      </section>
    </>
  );
}
