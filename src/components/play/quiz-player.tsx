"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  Loader2,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  Send,
  Timer,
  Trophy
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";
import { getPlayableQuiz } from "@/lib/firestore/attempts";
import { clearPlayState, loadPlayState, savePlayState } from "@/lib/quiz/play-storage";
import { startTrustedAttemptClient, submitTrustedAttemptClient } from "@/lib/trusted/client";
import { cn, formatSeconds, titleCase } from "@/lib/utils";
import type { PlayQuestion, QuestionOption, Quiz, QuizAnswerState, QuizPlayState } from "@/types/domain";

function emptyAnswer(): QuizAnswerState {
  return {
    selectedAnswer: "",
    selectedAnswers: [],
    textAnswer: "",
    timeSpentSeconds: 0
  };
}

function hasAnswer(answer: QuizAnswerState | undefined) {
  if (!answer) return false;
  return Boolean(
    answer.selectedAnswer ||
      answer.selectedAnswers.length ||
      answer.textAnswer.trim()
  );
}

function formatClock(seconds: number | null) {
  if (seconds === null) return "Untimed";
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function getQuestionOptions(question: PlayQuestion): QuestionOption[] {
  if (question.type === "true-false" && question.options.length === 0) {
    return [
      { id: "true", text: "True" },
      { id: "false", text: "False" }
    ];
  }

  return question.options;
}

export function QuizPlayer({ quizId }: { quizId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const {
    user,
    loading: authLoading,
    authReady,
    refreshProfile
  } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [restoredState, setRestoredState] = useState<QuizPlayState | null>(null);
  const [playState, setPlayState] = useState<QuizPlayState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const assignmentContext = useMemo(() => {
    const assignmentId = searchParams.get("assignmentId");
    const classId = searchParams.get("classId");
    if (!assignmentId || !classId) return undefined;
    return {
      assignmentId,
      assignmentTitle: searchParams.get("assignmentTitle") || "Class assignment",
      classId,
      className: searchParams.get("className") || "Class",
      dueAt: searchParams.get("dueAt") || null
    };
  }, [searchParams]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const playStateRef = useRef<QuizPlayState | null>(null);
  const submittingRef = useRef(false);
  const questionEnteredAtRef = useRef<number>(Date.now());

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  useEffect(() => {
    if (!authReady || authLoading || !user) {
      setLoading(false);
      return;
    }

    const currentUser = user;
    let mounted = true;
    setLoading(true);
    setError(null);

    async function loadQuiz() {
      try {
        const nextQuiz = await getPlayableQuiz(quizId);

        if (!mounted) return;
        setQuiz(nextQuiz);

        if (nextQuiz) {
          const saved = loadPlayState(currentUser.uid, nextQuiz.id);
          if (saved?.attemptSessionId && saved.sessionToken && saved.safeQuestions?.length) {
            setQuestions(saved.safeQuestions);
            setRestoredState(saved);
          } else {
            setRestoredState(null);
          }
        }
      } catch (caught) {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : "Could not load this quiz.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadQuiz();

    return () => {
      mounted = false;
    };
  }, [authLoading, authReady, quizId, user]);

  useEffect(() => {
    if (started && playState && !submitting) {
      savePlayState(playState);
    }
  }, [playState, started, submitting]);

  useEffect(() => {
    if (!started || submitting) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [started, submitting]);

  const commitElapsed = useCallback(
    (state: QuizPlayState, now = Date.now()) => {
      const question = questions[state.currentIndex];
      if (!question) return state;

      const enteredAt = questionEnteredAtRef.current || now;
      const elapsed = Math.max(0, Math.round((now - enteredAt) / 1000));
      questionEnteredAtRef.current = now;

      if (!elapsed) return state;

      const currentAnswer = state.answers[question.id] ?? emptyAnswer();

      return {
        ...state,
        answers: {
          ...state.answers,
          [question.id]: {
            ...currentAnswer,
            timeSpentSeconds: currentAnswer.timeSpentSeconds + elapsed
          }
        }
      };
    },
    [questions]
  );

  const startWithState = useCallback((state: QuizPlayState) => {
    submittingRef.current = false;
    setSubmitting(false);
    setSubmitError(null);
    setConfirmOpen(false);
    setStarted(true);
    setPlayState(state);
    setRemainingSeconds(
      state.deadlineMs ? Math.max(0, Math.ceil((state.deadlineMs - Date.now()) / 1000)) : null
    );
    questionEnteredAtRef.current = Date.now();
  }, []);

  const beginNewAttempt = useCallback(async () => {
    if (!quiz || !user) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const startedAttempt = await startTrustedAttemptClient({
        user,
        quizId: quiz.id,
        assignmentId: assignmentContext?.assignmentId,
        classId: assignmentContext?.classId
      });
      const now = Date.now();
      const safeQuestions = startedAttempt.questions;
      setQuestions(safeQuestions);
      const deadline =
        startedAttempt.quiz.timeLimitSeconds > 0
          ? now + startedAttempt.quiz.timeLimitSeconds * 1000
          : null;
      const initialState: QuizPlayState = {
        quizId: quiz.id,
        userId: user.uid,
        attemptSessionId: startedAttempt.attemptSessionId,
        sessionToken: startedAttempt.sessionToken,
        safeQuestions,
        currentIndex: 0,
        startedAtMs: now,
        deadlineMs: deadline,
        answers: {},
        questionTime: {}
      };
      clearPlayState(user.uid, quiz.id);
      setRestoredState(null);
      startWithState(initialState);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start a trusted attempt.";
      setSubmitError(message);
      showToast({
        tone: "error",
        title: "Trusted attempt could not start",
        description: message
      });
    } finally {
      setSubmitting(false);
    }
  }, [assignmentContext, quiz, showToast, startWithState, user]);

  const resumeAttempt = useCallback(() => {
    if (!restoredState) return;
    startWithState(restoredState);
    setRestoredState(null);
  }, [restoredState, startWithState]);

  const submitAttempt = useCallback(
    async (autoSubmitted = false) => {
      const currentState = playStateRef.current;

      if (!currentState || !quiz || !user || submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      setSubmitError(null);

      const completedAtMs = Date.now();
      const finalizedState = commitElapsed(currentState, completedAtMs);
      setPlayState(finalizedState);

      try {
        if (!finalizedState.attemptSessionId || !finalizedState.sessionToken) {
          throw new Error("Trusted attempt session is missing. Start a fresh attempt.");
        }
        const result = await submitTrustedAttemptClient({
          user,
          attemptSessionId: finalizedState.attemptSessionId,
          sessionToken: finalizedState.sessionToken,
          answers: finalizedState.answers,
          clientStartedAtMs: finalizedState.startedAtMs,
          clientCompletedAtMs: completedAtMs
        });

        clearPlayState(user.uid, quiz.id);
        await refreshProfile().catch(() => null);
        showToast({
          tone: "success",
          title: autoSubmitted ? "Time submitted your quiz" : "Quiz submitted",
          description: "Your verified score and answer review are ready."
        });
        router.replace(result.resultPath);
      } catch (caught) {
        submittingRef.current = false;
        setSubmitting(false);
        savePlayState(finalizedState);
        const message =
          caught instanceof Error ? caught.message : "Could not save this attempt.";
        setSubmitError(message);
        showToast({
          tone: "error",
          title: "Attempt was not saved",
          description: "Your answers are still on this screen. Try submitting again."
        });
      }
    },
    [commitElapsed, quiz, refreshProfile, router, showToast, user]
  );

  useEffect(() => {
    if (!started || !playState?.deadlineMs || submitting) return;

    const tick = () => {
      const nextRemaining = Math.max(
        0,
        Math.ceil(((playStateRef.current?.deadlineMs ?? Date.now()) - Date.now()) / 1000)
      );
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        void submitAttempt(true);
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [playState?.deadlineMs, started, submitting, submitAttempt]);

  const currentQuestion = playState ? questions[playState.currentIndex] : null;
  const currentAnswer = currentQuestion
    ? playState?.answers[currentQuestion.id] ?? emptyAnswer()
    : emptyAnswer();
  const progress = playState
    ? Math.round(((playState.currentIndex + 1) / Math.max(1, questions.length)) * 100)
    : 0;
  const unansweredCount = playState
    ? questions.filter((question) => !hasAnswer(playState.answers[question.id])).length
    : questions.length;
  const lowTime = remainingSeconds !== null && remainingSeconds <= 60;

  const updateAnswer = useCallback(
    (updater: (answer: QuizAnswerState) => QuizAnswerState) => {
      if (!currentQuestion || submitting) return;

      setPlayState((state) => {
        if (!state) return state;
        const existing = state.answers[currentQuestion.id] ?? emptyAnswer();
        return {
          ...state,
          answers: {
            ...state.answers,
            [currentQuestion.id]: updater(existing)
          }
        };
      });
    },
    [currentQuestion, submitting]
  );

  const goToQuestion = useCallback(
    (index: number) => {
      if (submitting || index < 0 || index >= questions.length) return;

      setPlayState((state) => {
        if (!state) return state;
        return {
          ...commitElapsed(state),
          currentIndex: index
        };
      });
    },
    [commitElapsed, questions.length, submitting]
  );

  const answerSummary = useMemo(() => {
    if (!playState) return { answered: 0, skipped: questions.length };
    const answered = questions.filter((question) => hasAnswer(playState.answers[question.id])).length;
    return { answered, skipped: questions.length - answered };
  }, [playState, questions]);

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

  if (authLoading) {
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
          title="Sign in to start this quiz"
          description="Quizora saves attempts, XP, and answer-review snapshots to your profile, so solo play is login-required."
          actionHref={`/login?next=${encodeURIComponent(`/play/${quizId}`)}`}
          actionLabel="Sign in"
        />
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
          title="Quiz unavailable"
          description="This quiz is missing, private, archived, or still in draft. Only published public quizzes can be played."
          actionHref="/quizzes"
          actionLabel="Browse quizzes"
        />
      </div>
    );
  }

  if (!started || !playState || !currentQuestion) {
    return (
      <section className="relative overflow-hidden py-10 sm:py-14">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
        <div className="absolute inset-0 premium-grid opacity-45" />
        <div className="container-page relative grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
          <div>
            <Badge className="text-primary">Quiz arena</Badge>
            <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-6xl">
              {quiz.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              Begin when you are ready. The timer starts after you press Begin Quiz,
              and correct answers stay hidden until your saved result review.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Questions", value: String(questions.length || quiz.questionCount || "Ready") },
                { label: "Time limit", value: formatSeconds(quiz.timeLimitSeconds) },
                { label: "Points", value: String(quiz.totalPoints || questions.reduce((sum, item) => sum + item.points, 0)) },
                { label: "Difficulty", value: titleCase(quiz.difficulty) }
              ].map((item) => (
                <div
                  className="rounded-3xl border border-border bg-surface/75 p-4 shadow-sm"
                  key={item.label}
                >
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="p-6">
            <Trophy className="size-9 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">Ready checkpoint</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              <li>Attempts are saved to your signed-in profile.</li>
              <li>You can move between questions before submitting.</li>
              <li>Unanswered questions count as skipped.</li>
              <li>XP is awarded after submission.</li>
            </ul>
            <div className="mt-6 grid gap-3">
              {restoredState ? (
                <>
                  <Button icon={<PlayCircle className="size-4" />} onClick={resumeAttempt}>
                    Resume attempt
                  </Button>
                  <Button
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => void beginNewAttempt()}
                    variant="secondary"
                  >
                    Start over
                  </Button>
                </>
              ) : (
                  <Button disabled={submitting} icon={submitting ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />} onClick={() => void beginNewAttempt()}>
                    Begin Quiz
                  </Button>
                )}
              {submitError ? (
                <div className="rounded-3xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                  {submitError}
                </div>
              ) : null}
              <Button href={`/quizzes/${quiz.slug}`} variant="ghost">
                Back to details
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  const questionOptions = getQuestionOptions(currentQuestion);

  return (
    <section className="container-page py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button href={`/quizzes/${quiz.slug}`} icon={<ArrowLeft className="size-4" />} variant="ghost">
          Exit
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{answerSummary.answered} answered</Badge>
          <Badge>{answerSummary.skipped} skipped</Badge>
          <StatusBadge value={lowTime ? "draft" : "published"}>
            <Timer className="mr-1 size-3.5" />
            {formatClock(remainingSeconds)}
          </StatusBadge>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-full bg-muted">
        <div
          aria-label={`Quiz progress ${progress}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="h-3 rounded-full bg-primary transition-all duration-300"
          role="progressbar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 14 }}
            key={currentQuestion.id}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <Card className="overflow-hidden p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-primary">
                    Question {playState.currentIndex + 1} of {questions.length}
                  </p>
                  <h1 className="mt-3 text-balance text-3xl font-semibold sm:text-4xl">
                    {currentQuestion.questionText}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{currentQuestion.points} pts</Badge>
                  {currentQuestion.timeLimitSeconds ? (
                    <Badge>{formatSeconds(currentQuestion.timeLimitSeconds)} target</Badge>
                  ) : null}
                </div>
              </div>

              {currentQuestion.imageUrl ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="max-h-80 w-full object-cover"
                    src={currentQuestion.imageUrl}
                  />
                </div>
              ) : null}

              <div className="mt-7 grid gap-3">
                {currentQuestion.type === "text" ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Your answer
                    </span>
                    <Textarea
                      disabled={submitting}
                      onChange={(event) =>
                        updateAnswer((answer) => ({
                          ...answer,
                          selectedAnswer: "",
                          selectedAnswers: [],
                          textAnswer: event.target.value
                        }))
                      }
                      placeholder="Type a concise answer"
                      value={currentAnswer.textAnswer}
                    />
                  </label>
                ) : (
                  questionOptions.map((option) => {
                    const selected =
                      currentQuestion.type === "multiple-choice"
                        ? currentAnswer.selectedAnswers.includes(option.id)
                        : currentAnswer.selectedAnswer === option.id;

                    return (
                      <button
                        aria-pressed={selected}
                        className={cn(
                          "group flex w-full items-center justify-between gap-4 rounded-3xl border border-border bg-surface/70 p-4 text-left shadow-sm transition",
                          "hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10",
                          selected && "border-primary/60 bg-primary/12 shadow-glow"
                        )}
                        disabled={submitting}
                        key={option.id}
                        onClick={() => {
                          if (currentQuestion.type === "multiple-choice") {
                            updateAnswer((answer) => {
                              const selectedAnswers = answer.selectedAnswers.includes(option.id)
                                ? answer.selectedAnswers.filter((id) => id !== option.id)
                                : [...answer.selectedAnswers, option.id];
                              return {
                                ...answer,
                                selectedAnswer: "",
                                selectedAnswers,
                                textAnswer: ""
                              };
                            });
                            return;
                          }

                          updateAnswer((answer) => ({
                            ...answer,
                            selectedAnswer: option.id,
                            selectedAnswers: [],
                            textAnswer: ""
                          }));
                        }}
                        type="button"
                      >
                        <span>
                          <span className="block text-base font-semibold">{option.text}</span>
                          {option.imageUrl ? (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              Includes visual reference
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition",
                            selected && "border-primary bg-primary text-primary-foreground"
                          )}
                        >
                          {selected ? <Check className="size-4" /> : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {submitError ? (
                <div className="mt-5 rounded-3xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={submitting || playState.currentIndex === 0}
                  icon={<ArrowLeft className="size-4" />}
                  onClick={() => goToQuestion(playState.currentIndex - 1)}
                  variant="secondary"
                >
                  Previous
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {playState.currentIndex < questions.length - 1 ? (
                    <Button
                      disabled={submitting}
                      icon={<ArrowRight className="size-4" />}
                      onClick={() => goToQuestion(playState.currentIndex + 1)}
                    >
                      Next
                    </Button>
                  ) : null}
                  <Button
                    disabled={submitting}
                    icon={submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    onClick={() => setConfirmOpen(true)}
                    variant={playState.currentIndex === questions.length - 1 ? "primary" : "secondary"}
                  >
                    {submitting ? "Submitting" : "Submit"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Navigator</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jump before final submit.
                </p>
              </div>
              <Flag className="size-5 text-primary" />
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {questions.map((question, index) => {
                const answered = hasAnswer(playState.answers[question.id]);
                const active = index === playState.currentIndex;
                return (
                  <button
                    aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-2xl border border-border bg-surface/70 text-sm font-semibold transition",
                      active && "border-primary bg-primary text-primary-foreground shadow-glow",
                      !active && answered && "border-success/35 bg-success/10 text-success"
                    )}
                    disabled={submitting}
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    type="button"
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              {lowTime ? (
                <Clock3 className="mt-1 size-5 animate-pulse text-warning" />
              ) : (
                <CheckCircle2 className="mt-1 size-5 text-success" />
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {lowTime ? "Final minute" : "Exam mode"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Answers remain editable until submission. Review unlocks after the attempt is saved.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        confirmLabel="Submit attempt"
        description={`You have ${unansweredCount} unanswered ${unansweredCount === 1 ? "question" : "questions"}. Submitted attempts are locked for review.`}
        loading={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submitAttempt(false)}
        open={confirmOpen}
        title="Submit this quiz?"
      />
    </section>
  );
}
