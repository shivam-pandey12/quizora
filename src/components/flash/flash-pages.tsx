"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileQuestion,
  Flag,
  Lock,
  Play,
  Plus,
  RadioTower,
  RefreshCw,
  Rocket,
  Sparkles,
  Trophy,
  UsersRound,
  Wand2,
  X
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
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeCard } from "@/components/billing/billing-ui";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEntitlement } from "@/lib/billing/entitlement-provider";
import {
  advanceFlashQuizClient,
  convertFlashQuizClient,
  createFlashQuizClient,
  exportFlashResultsClient,
  extendFlashQuizClient,
  fetchSafeFlashQuestionsClient,
  finalizeFlashQuizClient,
  joinFlashQuizClient,
  lookupFlashQuizClient,
  listFlashQuestions,
  listUserFlashHistory,
  listenFlashAnswers,
  listenFlashPlayers,
  listenFlashQuizById,
  listenFlashResults,
  reportFlashQuizClient,
  startFlashQuizClient,
  submitFlashAnswerClient
} from "@/lib/firestore/flash";
import { getFlashQuizLimits, flashLimitSummary } from "@/lib/flash/limits";
import {
  answerDistribution,
  isFlashExpired,
  normalizeFlashCode,
  sortFlashPlayers,
  sortFlashResults
} from "@/lib/flash/shared";
import type {
  FlashAnswer,
  FlashPlayer,
  FlashQuestion,
  FlashQuiz,
  FlashResult,
  PlayQuestion,
  QuizAnswerState
} from "@/types/domain";

type DraftQuestion = {
  questionText: string;
  type: "single-choice" | "multiple-choice" | "true-false" | "short-answer";
  options: { id: string; text: string }[];
  correctAnswer: string;
  correctAnswers: string[];
  correctText: string;
  acceptableAnswers: string[];
  explanation: string;
  points: number;
  timeLimitSeconds: number;
};

const emptyQuestion = (index: number): DraftQuestion => ({
  questionText: "",
  type: "single-choice",
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" }
  ],
  correctAnswer: "a",
  correctAnswers: [],
  correctText: "",
  acceptableAnswers: [],
  explanation: "",
  points: 1,
  timeLimitSeconds: 30 + index * 0
});

function flashStatusTone(status: FlashQuiz["status"]) {
  if (status === "running") return "border-success/25 bg-success/10 text-success";
  if (status === "ended") return "border-blue/25 bg-blue/10 text-blue";
  if (status === "expired" || status === "archived") return "border-danger/25 bg-danger/10 text-danger";
  return "text-primary";
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function timeRemaining(value: string | null) {
  if (!value) return "No expiry";
  const seconds = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 1000));
  if (!seconds) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m left`;
  return `${minutes || 1}m left`;
}

function AuthRequired({ next }: { next: string }) {
  return (
    <section className="container-page py-12">
      <EmptyState
        icon={Lock}
        title="Sign in to use Flash Quizzes"
        description="Flash Quizzes require a Quizora profile so hosts, players, results, reports, exports, and abuse controls stay tied to real accounts."
        actionHref={`/login?next=${encodeURIComponent(next)}`}
        actionLabel="Login"
      />
    </section>
  );
}

function FlashCodeCard({ flashCode }: { flashCode: string }) {
  const { showToast } = useToast();
  async function copyCode() {
    const link = `${window.location.origin}/flash/${flashCode}`;
    await navigator.clipboard.writeText(`Join my Flash Quiz on Quizora: ${link} Code: ${flashCode}`);
    showToast({ tone: "success", title: "Flash invite copied", description: "Code and link are ready to share." });
  }

  return (
    <button
      className="group rounded-3xl border border-primary/25 bg-primary/10 px-5 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-primary/15"
      onClick={() => void copyCode()}
      type="button"
    >
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Flash Code</span>
      <span className="mt-1 flex items-center gap-3 font-mono text-3xl font-black tracking-[0.2em]">
        {flashCode}
        <Copy className="size-5 text-primary transition group-hover:scale-110" />
      </span>
    </button>
  );
}

function LeaderboardList({ players, results }: { players?: FlashPlayer[]; results?: FlashResult[] }) {
  const rows = results?.length
    ? sortFlashResults(results).map((result) => ({
        id: result.id,
        rank: result.rank,
        previousRank: result.previousRank,
        displayName: result.displayName,
        photoURL: result.photoURL,
        score: result.score,
        accuracy: result.accuracy,
        time: result.totalTimeSeconds,
        status: "completed"
      }))
    : sortFlashPlayers(players ?? []).map((player, index) => ({
        id: player.id,
        rank: player.rank || index + 1,
        previousRank: player.previousRank,
        displayName: player.displayName,
        photoURL: player.photoURL,
        score: player.score,
        accuracy: player.accuracy,
        time: player.totalTimeSeconds,
        status: player.status
      }));

  if (!rows.length) {
    return <EmptyState icon={Trophy} title="No leaderboard rows yet" description="Players appear here as soon as they join and answer." />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => {
        const delta = (row.previousRank || row.rank) - row.rank;
        return (
          <div
            className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface/75 p-4 transition hover:-translate-y-0.5 hover:border-primary/35"
            key={row.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
                #{row.rank || index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{row.displayName}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {row.status} {delta ? ` · ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}` : ""}
                </p>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-3 text-right text-sm">
              <span><b>{row.score}</b><br /><span className="text-xs text-muted-foreground">score</span></span>
              <span><b>{row.accuracy}%</b><br /><span className="text-xs text-muted-foreground">accuracy</span></span>
              <span><b>{row.time}s</b><br /><span className="text-xs text-muted-foreground">time</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FlashHubPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { plan } = useEntitlement();
  const { showToast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [hosted, setHosted] = useState<FlashQuiz[]>([]);
  const [results, setResults] = useState<FlashResult[]>([]);
  const limits = getFlashQuizLimits(plan, profile);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    listUserFlashHistory(user.uid, 8)
      .then((history) => {
        if (!mounted) return;
        setHosted(history.hosted);
        setResults(history.results);
      })
      .catch((caught) => showToast({ tone: "error", title: "Flash history unavailable", description: caught instanceof Error ? caught.message : "Could not load Flash history." }))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [showToast, user]);

  if (!user) return <AuthRequired next="/flash" />;

  async function join() {
    if (!user) return;
    try {
      const result = await joinFlashQuizClient(user, normalizeFlashCode(joinCode));
      router.push(result.playPath);
    } catch (caught) {
      showToast({ tone: "error", title: "Could not join Flash Quiz", description: caught instanceof Error ? caught.message : "Check the code and try again." });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Flash Quizzes"
        title="Create temporary quizzes for friends, classes, and quick practice"
        description="Flash Quizzes are code-based, login-required, temporary, noindex, and separate from Quizora's permanent public quiz catalog."
      >
        <Button href="/flash/create" icon={<Rocket className="size-4" />}>Create Flash Quiz</Button>
      </PageHeader>
      <section className="container-page grid gap-6 pb-14">
        <div className="grid gap-4 md:grid-cols-4">
          {flashLimitSummary(limits).map((item) => (
            <Card className="p-4" key={item}>
              <p className="text-sm font-semibold text-muted-foreground">{item}</p>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Join by Flash Code</span>
              <Input
                maxLength={8}
                onChange={(event) => setJoinCode(normalizeFlashCode(event.target.value))}
                placeholder="ABC123"
                value={joinCode}
              />
            </label>
            <Button disabled={joinCode.length < 4} icon={<ArrowRight className="size-4" />} onClick={() => void join()}>
              Join Flash Quiz
            </Button>
          </div>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Hosting</p>
                <h2 className="mt-1 text-2xl font-semibold">Your Flash Quizzes</h2>
              </div>
              <Button href="/flash/history" size="sm" variant="secondary">History</Button>
            </div>
            {loading ? <LoadingSkeleton variant="card" /> : null}
            {!loading && hosted.length ? (
              <div className="grid gap-3">
                {hosted.map((quiz) => (
                  <div className="rounded-3xl border border-border bg-surface/70 p-4" key={quiz.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Badge className={flashStatusTone(quiz.status)}>{quiz.status}</Badge>
                        <h3 className="mt-2 font-semibold">{quiz.title}</h3>
                        <p className="text-sm text-muted-foreground">{quiz.flashCode} · {timeRemaining(quiz.expiresAt)}</p>
                      </div>
                      <Button href={`/flash/${quiz.flashCode}/host`} size="sm" variant="secondary">Host</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {!loading && !hosted.length ? (
              <EmptyState icon={RadioTower} title="No Flash Quizzes yet" description="Create a temporary quiz and share a code when you are ready." actionHref="/flash/create" actionLabel="Create Flash Quiz" />
            ) : null}
          </Card>
          <Card className="p-6">
            <p className="text-sm font-semibold uppercase text-primary">Played</p>
            <h2 className="mt-1 text-2xl font-semibold">Recent Flash results</h2>
            <div className="mt-5 grid gap-3">
              {results.map((result) => (
                <div className="rounded-3xl border border-border bg-surface/70 p-4" key={result.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Rank #{result.rank}</p>
                      <p className="text-sm text-muted-foreground">{result.flashCode} · {result.score}/{result.totalPoints} · {result.accuracy}%</p>
                    </div>
                    <Button href={`/flash/${result.flashCode}/result`} size="sm" variant="secondary">Result</Button>
                  </div>
                </div>
              ))}
              {!results.length ? <EmptyState icon={Sparkles} title="No Flash results yet" description="Join a Flash Quiz with a code to build your temporary history." /> : null}
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

export function FlashCreatePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { plan } = useEntitlement();
  const { showToast } = useToast();
  const limits = getFlashQuizLimits(plan, profile);
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    mode: "live",
    expiryHours: Math.min(7, limits.maxExpiryHours),
    maxPlayers: Math.min(10, limits.maxPlayers),
    questionTimerSeconds: 30,
    leaderboardMode: "score",
    showAnswersAfterEach: false,
    shuffleQuestions: false,
    shuffleOptions: true,
    showLeaderboardDuringPlay: true,
    showLeaderboardAfterFinish: true
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion(0), emptyQuestion(1), emptyQuestion(2)]);

  if (!user) return <AuthRequired next="/flash/create" />;

  const validQuestions = questions.filter((question) => question.questionText.trim() && question.explanation.trim());
  const blocked = validQuestions.length < 3 || questions.length > limits.maxQuestions || form.maxPlayers > limits.maxPlayers || form.expiryHours > limits.maxExpiryHours;

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, itemIndex) => itemIndex === optionIndex ? { ...option, text } : option)
        };
      })
    );
  }

  async function create() {
    if (!user) return;
    setWorking(true);
    try {
      const payload = {
        ...form,
        questions,
        settings: {
          shuffleQuestions: form.shuffleQuestions,
          shuffleOptions: form.shuffleOptions,
          showCorrectAfterEachQuestion: form.showAnswersAfterEach,
          allowLateJoin: true,
          requireLogin: true,
          allowRetake: form.mode === "self-paced",
          showLeaderboardDuringPlay: form.showLeaderboardDuringPlay,
          showLeaderboardAfterFinish: form.showLeaderboardAfterFinish
        }
      };
      const result = await createFlashQuizClient(user, payload);
      showToast({ tone: "success", title: "Flash Quiz created", description: `Code ${result.flashCode} is ready.` });
      router.push(result.hostPath);
    } catch (caught) {
      showToast({ tone: "error", title: "Flash Quiz was not created", description: caught instanceof Error ? caught.message : "Check the form and try again." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Create Flash Quiz"
        title="Build a temporary quiz and share it by code"
        description="Flash Quizzes stay link-only and noindex. They are not added to public Quizora catalog pages, sitemaps, global leaderboards, XP, or permanent attempts."
      />
      <section className="container-page grid gap-6 pb-14">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold">Setup</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2"><span className="text-sm font-semibold">Title</span><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Friday Science Flash Battle" /></label>
              <label className="grid gap-2"><span className="text-sm font-semibold">Description</span><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A quick temporary quiz for today’s practice session." /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2"><span className="text-sm font-semibold">Mode</span><Select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="live">Live host mode</option><option value="self-paced">Self-paced</option></Select></label>
                <label className="grid gap-2"><span className="text-sm font-semibold">Leaderboard</span><Select value={form.leaderboardMode} onChange={(event) => setForm({ ...form, leaderboardMode: event.target.value })}><option value="score">Score</option><option value="score-speed">Score + speed</option></Select></label>
                <label className="grid gap-2"><span className="text-sm font-semibold">Expiry hours</span><Input min={1} max={limits.maxExpiryHours} type="number" value={form.expiryHours} onChange={(event) => setForm({ ...form, expiryHours: Number(event.target.value) })} /></label>
                <label className="grid gap-2"><span className="text-sm font-semibold">Max players</span><Input min={1} max={limits.maxPlayers} type="number" value={form.maxPlayers} onChange={(event) => setForm({ ...form, maxPlayers: Number(event.target.value) })} /></label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["shuffleQuestions", "Shuffle questions"],
                  ["shuffleOptions", "Shuffle options"],
                  ["showAnswersAfterEach", "Show answers after each question"],
                  ["showLeaderboardDuringPlay", "Live leaderboard"]
                ].map(([key, label]) => (
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3 text-sm font-semibold" key={key}>
                    <input
                      checked={Boolean(form[key as keyof typeof form])}
                      onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-2xl font-semibold">Plan limits</h2>
            <div className="mt-5 grid gap-3">
              {flashLimitSummary(limits).map((item) => <Badge className="text-primary" key={item}>{item}</Badge>)}
            </div>
            <div className="mt-6 rounded-3xl border border-border bg-surface/70 p-4">
              <p className="text-sm font-semibold">Ready checklist</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="size-4 text-success" /> Login required for every player</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 text-success" /> No SEO indexing or public catalog listing</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 text-success" /> Temporary Flash leaderboard only</li>
                <li className="flex gap-2"><AlertTriangle className="size-4 text-primary" /> Add at least 3 clear questions</li>
              </ul>
            </div>
          </Card>
        </div>
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Questions</p>
              <h2 className="mt-1 text-2xl font-semibold">{questions.length}/{limits.maxQuestions} questions</h2>
            </div>
            <Button disabled={questions.length >= limits.maxQuestions} icon={<Plus className="size-4" />} onClick={() => setQuestions((current) => [...current, emptyQuestion(current.length)])} variant="secondary">
              Add question
            </Button>
          </div>
          <div className="mt-6 grid gap-5">
            {questions.map((question, index) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={index}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Badge>Question {index + 1}</Badge>
                  {questions.length > 3 ? <button className="text-danger" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><X className="size-4" /></button> : null}
                </div>
                <div className="grid gap-4">
                  <Input value={question.questionText} onChange={(event) => updateQuestion(index, { questionText: event.target.value })} placeholder="Write a clear, original question" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Select value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as DraftQuestion["type"], correctAnswer: event.target.value === "true-false" ? "true" : question.correctAnswer })}>
                      <option value="single-choice">Single choice</option>
                      <option value="multiple-choice">Multiple choice</option>
                      <option value="true-false">True/false</option>
                      <option value="short-answer">Short answer</option>
                    </Select>
                    <Input min={1} max={20} type="number" value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} />
                    <Input min={10} max={180} type="number" value={question.timeLimitSeconds} onChange={(event) => updateQuestion(index, { timeLimitSeconds: Number(event.target.value) })} />
                  </div>
                  {question.type === "short-answer" ? (
                    <div className="grid gap-3">
                      <Input value={question.correctText} onChange={(event) => updateQuestion(index, { correctText: event.target.value, correctAnswer: event.target.value })} placeholder="Accepted short answer" />
                      <p className="text-xs text-muted-foreground">Advanced Flash types such as matching, ordering, numeric, and fill-blank are available in permanent quizzes first.</p>
                    </div>
                  ) : question.type === "true-false" ? (
                    <Select value={question.correctAnswer} onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </Select>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label className="grid gap-2" key={option.id}>
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Option {option.id.toUpperCase()}</span>
                          <div className="flex gap-2">
                            <Input value={option.text} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`Option ${option.id.toUpperCase()}`} />
                            <input
                              checked={question.type === "multiple-choice" ? question.correctAnswers.includes(option.id) : question.correctAnswer === option.id}
                              onChange={(event) => {
                                if (question.type === "multiple-choice") {
                                  const next = event.target.checked
                                    ? [...question.correctAnswers, option.id]
                                    : question.correctAnswers.filter((item) => item !== option.id);
                                  updateQuestion(index, { correctAnswers: next });
                                } else {
                                  updateQuestion(index, { correctAnswer: option.id });
                                }
                              }}
                              type={question.type === "multiple-choice" ? "checkbox" : "radio"}
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <Textarea value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} placeholder="Add a short explanation so players can learn after the quiz." />
                </div>
              </div>
            ))}
          </div>
          {blocked ? (
            <p className="mt-5 rounded-2xl bg-danger/10 p-3 text-sm font-semibold text-danger">
              Add at least 3 valid questions and keep expiry, player count, and question count inside your plan limits.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={blocked || working} icon={<Rocket className="size-4" />} onClick={() => void create()}>
              {working ? "Creating..." : "Create Flash Quiz"}
            </Button>
            <Button href="/flash" variant="secondary">Cancel</Button>
          </div>
        </Card>
      </section>
    </>
  );
}

export function FlashLandingPage({ flashCode }: { flashCode: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [flashQuiz, setFlashQuiz] = useState<FlashQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    lookupFlashQuizClient(user, flashCode)
      .then(({ flashQuiz: nextQuiz }) => {
        setFlashQuiz(nextQuiz);
        unsubscribe = listenFlashQuizById(nextQuiz.id, setFlashQuiz, setError);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Flash Quiz could not load."))
      .finally(() => setLoading(false));
    return () => {
      unsubscribe?.();
    };
  }, [flashCode, user]);

  if (!user) return <AuthRequired next={`/flash/${flashCode}`} />;

  async function join() {
    if (!user) return;
    try {
      const result = await joinFlashQuizClient(user, flashCode);
      router.push(result.hostPath ?? result.playPath);
    } catch (caught) {
      showToast({ tone: "error", title: "Could not join", description: caught instanceof Error ? caught.message : "Try again." });
    }
  }

  return (
    <section className="container-page py-12">
      {loading ? <LoadingSkeleton variant="page" /> : null}
      {error ? <EmptyState icon={AlertTriangle} title="Flash Quiz unavailable" description={error} actionHref="/flash" actionLabel="Back to Flash" /> : null}
      {!loading && !flashQuiz ? <EmptyState icon={AlertTriangle} title="Flash Quiz not found" description="Check the code and ask the host to share a fresh link." actionHref="/flash" actionLabel="Open Flash hub" /> : null}
      {flashQuiz ? (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Badge className={flashStatusTone(flashQuiz.status)}>{flashQuiz.status}</Badge>
              <h1 className="mt-4 text-4xl font-semibold">{flashQuiz.title}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">{flashQuiz.description || "A temporary Quizora Flash Quiz shared by code."}</p>
            </div>
            <FlashCodeCard flashCode={flashQuiz.flashCode} />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard icon={<Clock className="size-5" />} label="Expiry" value={timeRemaining(flashQuiz.expiresAt)} helper={formatDate(flashQuiz.expiresAt)} />
            <StatCard icon={<FileQuestion className="size-5" />} label="Questions" value={String(flashQuiz.questionCount)} helper={`${flashQuiz.totalPoints} points`} />
            <StatCard icon={<UsersRound className="size-5" />} label="Players" value={`${flashQuiz.playerCount}/${flashQuiz.maxPlayers}`} helper="Login required" />
            <StatCard icon={<RadioTower className="size-5" />} label="Mode" value={flashQuiz.mode === "live" ? "Live" : "Self-paced"} helper="Temporary leaderboard" />
          </div>
          {isFlashExpired(flashQuiz) ? (
            <EmptyState className="mt-6" icon={Clock} title="This Flash Quiz has expired" description="New joins and plays are blocked after expiry. Hosts and participants may still view results." />
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button icon={<Play className="size-4" />} onClick={() => void join()}>
                Join and play
              </Button>
              {flashQuiz.hostId === user.uid ? <Button href={`/flash/${flashQuiz.flashCode}/host`} variant="secondary">Host dashboard</Button> : null}
              {flashQuiz.status === "ended" ? <Button href={`/flash/${flashQuiz.flashCode}/result`} variant="secondary">View result</Button> : null}
            </div>
          )}
          <div className="mt-6">
            <FlashReportButton flashQuiz={flashQuiz} />
          </div>
        </Card>
      ) : null}
    </section>
  );
}

export function FlashPlayPage({ flashCode }: { flashCode: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [flashQuiz, setFlashQuiz] = useState<FlashQuiz | null>(null);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [players, setPlayers] = useState<FlashPlayer[]>([]);
  const [localIndex, setLocalIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    lookupFlashQuizClient(user, flashCode)
      .then(({ flashQuiz: nextQuiz }) => {
        setFlashQuiz(nextQuiz);
        unsubscribe = listenFlashQuizById(nextQuiz.id, setFlashQuiz, setError);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Flash Quiz could not load."));
    return () => {
      unsubscribe?.();
    };
  }, [flashCode, user]);

  useEffect(() => {
    if (!user || !flashQuiz) return;
    fetchSafeFlashQuestionsClient(user, flashQuiz.id)
      .then((result) => setQuestions(result.questions))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Questions could not load."));
    return listenFlashPlayers(flashQuiz.id, setPlayers, setError);
  }, [flashQuiz, user]);

  useEffect(() => {
    setSelectedAnswer("");
    setSelectedAnswers([]);
    setStartedAt(Date.now());
  }, [flashQuiz?.currentQuestionIndex, localIndex]);

  if (!user) return <AuthRequired next={`/flash/${flashCode}/play`} />;
  if (error) return <section className="container-page py-12"><EmptyState icon={AlertTriangle} title="Flash play unavailable" description={error} actionHref={`/flash/${flashCode}`} actionLabel="Back to invite" /></section>;
  if (!flashQuiz || !questions.length) return <section className="container-page py-12"><LoadingSkeleton variant="page" /></section>;
  if (isFlashExpired(flashQuiz)) return <section className="container-page py-12"><EmptyState icon={Clock} title="This Flash Quiz has expired" description="New play is blocked after expiry." actionHref={`/flash/${flashCode}/result`} actionLabel="View results" /></section>;

  const currentIndex = flashQuiz.mode === "live" ? flashQuiz.currentQuestionIndex : localIndex;
  const question = questions[currentIndex];
  const currentPlayer = players.find((player) => player.userId === user.uid);
  const alreadySubmitted = submitted.has(currentIndex) || (flashQuiz.mode === "live" && currentPlayer?.status === "submitted");
  const leaderboard = sortFlashPlayers(players).slice(0, 5);

  async function submit() {
    if (!user || !flashQuiz || !question) return;
    const answer: QuizAnswerState = {
      selectedAnswer,
      selectedAnswers,
      textAnswer,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
    };
    try {
      const result = await submitFlashAnswerClient({ user, flashQuizId: flashQuiz.id, questionIndex: currentIndex, answer });
      setSubmitted((current) => new Set([...current, currentIndex]));
      setSelectedAnswer("");
      setSelectedAnswers([]);
      setTextAnswer("");
      setStartedAt(Date.now());
      if (result.completed && result.resultPath) {
        router.push(result.resultPath);
        return;
      }
      if (flashQuiz.mode === "self-paced") {
        setLocalIndex((index) => Math.min(index + 1, questions.length - 1));
      }
    } catch (caught) {
      showToast({ tone: "error", title: "Answer not submitted", description: caught instanceof Error ? caught.message : "Try again." });
    }
  }

  if (flashQuiz.mode === "live" && flashQuiz.status !== "running") {
    return (
      <section className="container-page py-12">
        <Card className="p-8 text-center">
          <Badge className="text-primary">Waiting for host</Badge>
          <h1 className="mt-4 text-4xl font-semibold">{flashQuiz.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">You are in the Flash lobby. The question will appear when the host starts or advances the quiz.</p>
          <div className="mt-6"><LeaderboardList players={players} /></div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container-page grid gap-6 py-10 lg:grid-cols-[1fr_22rem]">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="text-primary">{flashQuiz.flashCode}</Badge>
          <Badge>{currentIndex + 1}/{questions.length}</Badge>
        </div>
        <h1 className="mt-6 text-3xl font-semibold">{question.questionText}</h1>
        <div className="mt-6 grid gap-3">
          {question.type === "short-answer" || question.type === "text" ? (
            <Textarea disabled={alreadySubmitted} value={textAnswer} onChange={(event) => setTextAnswer(event.target.value)} placeholder="Type a concise answer" />
          ) : question.options.map((option) => {
            const active = question.type === "multiple-choice" ? selectedAnswers.includes(option.id) : selectedAnswer === option.id;
            return (
              <button
                className={`rounded-3xl border p-4 text-left font-semibold transition ${active ? "border-primary bg-primary/12 text-primary" : "border-border bg-surface/70 hover:border-primary/40"}`}
                disabled={alreadySubmitted}
                key={option.id}
                onClick={() => {
                  if (question.type === "multiple-choice") {
                    setSelectedAnswers((current) => current.includes(option.id) ? current.filter((item) => item !== option.id) : [...current, option.id]);
                  } else {
                    setSelectedAnswer(option.id);
                  }
                }}
                type="button"
              >
                {option.text}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={alreadySubmitted || (!selectedAnswer && !selectedAnswers.length && !textAnswer.trim())} icon={<CheckCircle2 className="size-4" />} onClick={() => void submit()}>
            {alreadySubmitted ? "Submitted" : "Submit answer"}
          </Button>
          {flashQuiz.mode === "self-paced" && currentIndex > 0 ? <Button onClick={() => setLocalIndex((index) => Math.max(0, index - 1))} variant="secondary">Back</Button> : null}
        </div>
      </Card>
      <aside className="grid gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold uppercase text-primary">Temporary leaderboard</p>
          <div className="mt-4 grid gap-2">
            {leaderboard.map((player, index) => (
              <div className="flex items-center justify-between rounded-2xl bg-surface/70 p-3 text-sm" key={player.id}>
                <span>#{player.rank || index + 1} {player.displayName}</span>
                <b>{player.score}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold uppercase text-primary">Expiry</p>
          <p className="mt-2 text-2xl font-semibold">{timeRemaining(flashQuiz.expiresAt)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Flash results stay separate from permanent Quizora attempts and global leaderboards.</p>
        </Card>
      </aside>
    </section>
  );
}

export function FlashHostPage({ flashCode }: { flashCode: string }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { plan } = useEntitlement();
  const { showToast } = useToast();
  const limits = getFlashQuizLimits(plan, profile);
  const [flashQuiz, setFlashQuiz] = useState<FlashQuiz | null>(null);
  const [questions, setQuestions] = useState<FlashQuestion[]>([]);
  const [players, setPlayers] = useState<FlashPlayer[]>([]);
  const [answers, setAnswers] = useState<FlashAnswer[]>([]);
  const [results, setResults] = useState<FlashResult[]>([]);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<"start" | "end" | "extend" | "convert" | null>(null);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    lookupFlashQuizClient(user, flashCode)
      .then(({ flashQuiz: nextQuiz }) => {
        setFlashQuiz(nextQuiz);
        unsubscribe = listenFlashQuizById(nextQuiz.id, setFlashQuiz, setError);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Flash Quiz could not load."));
    return () => {
      unsubscribe?.();
    };
  }, [flashCode, user]);

  useEffect(() => {
    if (!flashQuiz) return;
    listFlashQuestions(flashQuiz.id).then(setQuestions).catch((caught) => setError(caught instanceof Error ? caught.message : "Questions could not load."));
    const unsubPlayers = listenFlashPlayers(flashQuiz.id, setPlayers, setError);
    const unsubResults = listenFlashResults(flashQuiz.id, setResults, setError);
    return () => {
      unsubPlayers();
      unsubResults();
    };
  }, [flashQuiz]);

  useEffect(() => {
    if (!flashQuiz) return;
    return listenFlashAnswers(flashQuiz.id, flashQuiz.currentQuestionIndex, setAnswers, setError);
  }, [flashQuiz]);

  if (!user) return <AuthRequired next={`/flash/${flashCode}/host`} />;
  if (error) return <section className="container-page py-12"><EmptyState icon={AlertTriangle} title="Host dashboard unavailable" description={error} actionHref="/flash" actionLabel="Back to Flash" /></section>;
  if (!flashQuiz) return <section className="container-page py-12"><LoadingSkeleton variant="page" /></section>;
  if (flashQuiz.hostId !== user.uid && profile?.role !== "admin") {
    return <section className="container-page py-12"><EmptyState icon={Lock} title="Host access required" description="Only the Flash Quiz host or an admin can open this dashboard." actionHref={`/flash/${flashCode}`} actionLabel="Back to invite" /></section>;
  }

  const currentQuestion = questions[flashQuiz.currentQuestionIndex];
  const activePlayers = players.filter((player) => player.status !== "left" && player.status !== "disconnected");
  const dist = answerDistribution(answers);

  async function act(action: "start" | "advance" | "end" | "extend" | "convert" | "export") {
    if (!user || !flashQuiz) return;
    try {
      if (action === "start") await startFlashQuizClient(user, flashQuiz.id);
      if (action === "advance") {
        const result = await advanceFlashQuizClient(user, flashQuiz.id);
        if (result.completed) router.push(`/flash/${flashQuiz.flashCode}/result`);
      }
      if (action === "end") await finalizeFlashQuizClient(user, flashQuiz.id);
      if (action === "extend") await extendFlashQuizClient(user, flashQuiz.id, Math.min(limits.maxExpiryHours, Math.max(24, flashQuiz.expiryHours)));
      if (action === "convert") {
        const result = await convertFlashQuizClient(user, flashQuiz.id);
        router.push(result.editPath);
      }
      if (action === "export") {
        const csv = await exportFlashResultsClient(user, flashQuiz.id);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `quizora-flash-${flashQuiz.flashCode}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      setConfirmAction(null);
      showToast({ tone: "success", title: "Flash dashboard updated" });
    } catch (caught) {
      showToast({ tone: "error", title: "Action blocked", description: caught instanceof Error ? caught.message : "Try again." });
    }
  }

  return (
    <section className="container-page grid gap-6 py-8">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Badge className={flashStatusTone(flashQuiz.status)}>{flashQuiz.status}</Badge>
            <h1 className="mt-3 text-4xl font-semibold">{flashQuiz.title}</h1>
            <p className="mt-2 text-muted-foreground">{flashQuiz.mode === "live" ? "Live host mode" : "Self-paced mode"} · {timeRemaining(flashQuiz.expiresAt)}</p>
          </div>
          <FlashCodeCard flashCode={flashQuiz.flashCode} />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<UsersRound className="size-5" />} label="Players" value={`${activePlayers.length}/${flashQuiz.maxPlayers}`} helper="Login required" />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Submitted" value={`${answers.length}`} helper="Current question" />
        <StatCard icon={<FileQuestion className="size-5" />} label="Question" value={`${flashQuiz.currentQuestionIndex + 1}/${questions.length || flashQuiz.questionCount}`} helper={currentQuestion?.timeLimitSeconds ? `${currentQuestion.timeLimitSeconds}s timer` : "Ready"} />
        <StatCard icon={<Clock className="size-5" />} label="Expires" value={timeRemaining(flashQuiz.expiresAt)} helper={formatDate(flashQuiz.expiresAt)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Live controls</p>
                <h2 className="mt-1 text-2xl font-semibold">Host command center</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={flashQuiz.mode !== "live" || flashQuiz.status !== "active" || isFlashExpired(flashQuiz)} icon={<Play className="size-4" />} onClick={() => setConfirmAction("start")}>Start</Button>
                <Button disabled={flashQuiz.mode !== "live" || flashQuiz.status !== "running"} onClick={() => void act("advance")} variant="secondary">Advance</Button>
                <Button disabled={flashQuiz.status === "ended" || flashQuiz.status === "archived"} onClick={() => setConfirmAction("end")} variant="danger">End</Button>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-border bg-surface/70 p-5">
              <Badge>Current question</Badge>
              <h3 className="mt-3 text-2xl font-semibold">{currentQuestion?.questionText || "Waiting to start"}</h3>
              {currentQuestion ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {currentQuestion.options.map((option) => (
                    <div className="rounded-2xl border border-border bg-background/40 p-3" key={option.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{option.text}</span>
                        <Badge>{dist.get(option.id) ?? 0}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-semibold uppercase text-primary">Live fluctuating leaderboard</p>
            <h2 className="mt-1 text-2xl font-semibold">Ranks update as answers land</h2>
            <div className="mt-5"><LeaderboardList players={players} results={flashQuiz.status === "ended" ? results : undefined} /></div>
          </Card>
        </div>
        <aside className="grid gap-6">
          <Card className="p-6">
            <p className="text-sm font-semibold uppercase text-primary">Player manager</p>
            <div className="mt-4 grid gap-3">
              {activePlayers.map((player) => (
                <div className="rounded-2xl border border-border bg-surface/70 p-3" key={player.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{player.displayName}</span>
                    <Badge>{player.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">#{player.rank || "-"} · {player.score} points · {player.accuracy}%</p>
                </div>
              ))}
            </div>
          </Card>
          {limits.canExportResults ? (
            <Button icon={<Download className="size-4" />} onClick={() => void act("export")} variant="secondary">Export CSV</Button>
          ) : (
            <UpgradeCard title="Unlock Flash result exports" description="Plus, Creator, and Classroom plans can export temporary Flash results." />
          )}
          {limits.canExtendExpiry ? (
            <Button icon={<RefreshCw className="size-4" />} onClick={() => setConfirmAction("extend")} variant="secondary">Extend expiry</Button>
          ) : (
            <UpgradeCard title="Longer Flash expiry" description="Free Flash Quizzes expire within 7 hours. Upgrade to extend live sessions." />
          )}
          {limits.canConvertToDraft ? (
            <Button icon={<Wand2 className="size-4" />} onClick={() => setConfirmAction("convert")} variant="secondary">Convert to creator draft</Button>
          ) : (
            <UpgradeCard title="Convert Flash to draft" description="Creator and Classroom plans can turn temporary quizzes into creator drafts for review." />
          )}
        </aside>
      </div>
      <ConfirmDialog
        confirmLabel={
          confirmAction === "start"
            ? "Start live quiz"
            : confirmAction === "end"
              ? "End quiz"
              : confirmAction === "extend"
                ? "Extend expiry"
                : "Convert to draft"
        }
        description={
          confirmAction === "start"
            ? "Players will move from the lobby into the first live question. Make sure everyone who should join is ready."
            : confirmAction === "end"
              ? "This will finalize the Flash Quiz and send players to the temporary results. Players will not be able to keep answering."
              : confirmAction === "extend"
                ? "This updates the expiry window for this temporary Flash Quiz according to your current plan limit."
                : "This copies the Flash Quiz questions into a private creator draft. It will not publish anything publicly."
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          void act(confirmAction);
        }}
        open={Boolean(confirmAction)}
        title={
          confirmAction === "start"
            ? "Start this Flash Quiz?"
            : confirmAction === "end"
              ? "End this Flash Quiz?"
              : confirmAction === "extend"
                ? "Extend Flash Quiz expiry?"
                : "Convert to creator draft?"
        }
      />
    </section>
  );
}

export function FlashResultPage({ flashCode }: { flashCode: string }) {
  const { user } = useAuth();
  const [flashQuiz, setFlashQuiz] = useState<FlashQuiz | null>(null);
  const [results, setResults] = useState<FlashResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    lookupFlashQuizClient(user, flashCode)
      .then(({ flashQuiz: nextQuiz }) => {
        setFlashQuiz(nextQuiz);
        unsubscribe = listenFlashQuizById(nextQuiz.id, setFlashQuiz, setError);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Flash Quiz could not load."));
    return () => {
      unsubscribe?.();
    };
  }, [flashCode, user]);

  useEffect(() => {
    if (!flashQuiz) return;
    return listenFlashResults(flashQuiz.id, setResults, setError);
  }, [flashQuiz]);

  if (!user) return <AuthRequired next={`/flash/${flashCode}/result`} />;
  if (error) return <section className="container-page py-12"><EmptyState icon={AlertTriangle} title="Flash result unavailable" description={error} actionHref="/flash" actionLabel="Back to Flash" /></section>;
  if (!flashQuiz) return <section className="container-page py-12"><LoadingSkeleton variant="page" /></section>;

  const podium = sortFlashResults(results).slice(0, 3);
  return (
    <section className="container-page grid gap-6 py-10">
      <Card className="p-8 text-center">
        <Badge className="text-primary">{flashQuiz.flashCode}</Badge>
        <h1 className="mt-4 text-4xl font-semibold">Flash Quiz results</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Temporary results for {flashQuiz.title}. These do not write to permanent attempts, XP, streaks, badges, or global leaderboards.</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {podium.map((result) => (
          <Card className="p-6 text-center" key={result.id}>
            <Trophy className="mx-auto size-8 text-primary" />
            <p className="mt-3 text-sm font-semibold uppercase text-primary">Rank #{result.rank}</p>
            <h2 className="mt-1 text-2xl font-semibold">{result.displayName}</h2>
            <p className="mt-2 text-muted-foreground">{result.score}/{result.totalPoints} · {result.accuracy}%</p>
          </Card>
        ))}
      </div>
      <LeaderboardList results={results} />
      <div className="flex flex-wrap gap-3">
        <Button href="/flash" variant="secondary">Back to Flash</Button>
        {flashQuiz.hostId === user.uid ? <Button href={`/flash/${flashQuiz.flashCode}/host`}>Host dashboard</Button> : null}
      </div>
    </section>
  );
}

export function FlashHistoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [hosted, setHosted] = useState<FlashQuiz[]>([]);
  const [results, setResults] = useState<FlashResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listUserFlashHistory(user.uid, 30)
      .then((history) => {
        setHosted(history.hosted);
        setResults(history.results);
      })
      .catch((caught) => showToast({ tone: "error", title: "History unavailable", description: caught instanceof Error ? caught.message : "Could not load history." }))
      .finally(() => setLoading(false));
  }, [showToast, user]);

  if (!user) return <AuthRequired next="/flash/history" />;

  return (
    <>
      <PageHeader eyebrow="Flash history" title="Temporary quizzes you hosted or played" description="Flash history stays private to your account and remains separate from permanent Quizora quiz attempts." />
      <section className="container-page grid gap-6 pb-14 lg:grid-cols-2">
        {loading ? <LoadingSkeleton variant="card" /> : null}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Hosted</h2>
          <div className="mt-5 grid gap-3">
            {hosted.map((quiz) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={quiz.id}>
                <Badge className={flashStatusTone(quiz.status)}>{quiz.status}</Badge>
                <h3 className="mt-2 font-semibold">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground">{quiz.flashCode} · {timeRemaining(quiz.expiresAt)}</p>
                <Button className="mt-3" href={`/flash/${quiz.flashCode}/host`} size="sm" variant="secondary">Open</Button>
              </div>
            ))}
            {!hosted.length ? <EmptyState icon={RadioTower} title="No hosted Flash Quizzes" description="Create your first temporary quiz from the Flash hub." /> : null}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Played</h2>
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <div className="rounded-3xl border border-border bg-surface/70 p-4" key={result.id}>
                <h3 className="font-semibold">Rank #{result.rank}</h3>
                <p className="text-sm text-muted-foreground">{result.flashCode} · {result.score}/{result.totalPoints} · {result.accuracy}%</p>
                <Button className="mt-3" href={`/flash/${result.flashCode}/result`} size="sm" variant="secondary">Result</Button>
              </div>
            ))}
            {!results.length ? <EmptyState icon={Trophy} title="No played Flash Quizzes" description="Join a Flash Quiz with a code to see results here." /> : null}
          </div>
        </Card>
      </section>
    </>
  );
}

export function FlashReportButton({ flashQuiz }: { flashQuiz: FlashQuiz }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong answer");
  const [details, setDetails] = useState("");

  async function report() {
    if (!user) return;
    try {
      await reportFlashQuizClient(user, flashQuiz.id, reason, details);
      showToast({ tone: "success", title: "Report submitted", description: "Quizora admins can review this Flash Quiz." });
      setOpen(false);
    } catch (caught) {
      showToast({ tone: "error", title: "Report failed", description: caught instanceof Error ? caught.message : "Try again." });
    }
  }

  return (
    <Card className="p-4">
      <button className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground" onClick={() => setOpen((value) => !value)} type="button">
        <span className="inline-flex items-center gap-2"><Flag className="size-4" /> Report this Flash Quiz</span>
        <ArrowRight className={`size-4 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <div className="mt-4 grid gap-3">
          <Select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="wrong answer">Wrong answer</option>
            <option value="inappropriate content">Inappropriate content</option>
            <option value="spam">Spam</option>
            <option value="copied content">Copied/copyrighted content</option>
            <option value="other">Other</option>
          </Select>
          <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add a short note for admins." />
          <Button onClick={() => void report()} size="sm" variant="secondary">Submit report</Button>
        </div>
      ) : null}
    </Card>
  );
}
