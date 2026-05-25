"use client";

import {
  AlertTriangle,
  Bot,
  Check,
  Clock3,
  Crown,
  Database,
  Loader2,
  LockKeyhole,
  Send,
  Trophy
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageDisplay } from "@/components/ui/image-display";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { botAnswerDelayMs } from "@/lib/firestore/bots";
import {
  cancelRoom,
  listenRoomAnswers,
  listenRoomByCode,
  listenRoomPlayers,
  updatePlayerHeartbeat
} from "@/lib/firestore/rooms";
import {
  fetchSafeRoomQuestionsClient,
  finalizeTrustedRoomQuestionClient,
  submitTrustedRoomAnswerClient
} from "@/lib/trusted/client";
import { cn, formatSeconds } from "@/lib/utils";
import type { PlayQuestion, QuestionOption, QuizAnswerState, Room, RoomAnswer, RoomPlayer } from "@/types/domain";

function emptyAnswer(): QuizAnswerState {
  return {
    selectedAnswer: "",
    selectedAnswers: [],
    textAnswer: "",
    timeSpentSeconds: 0
  };
}

function hasLocalAnswer(answer: QuizAnswerState) {
  return Boolean(answer.selectedAnswer || answer.selectedAnswers.length || answer.textAnswer.trim());
}

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function stableOptionOrder(options: QuestionOption[], roomId: string, questionId: string) {
  return [...options].sort((first, second) => {
    const left = `${roomId}:${questionId}:${first.id}`;
    const right = `${roomId}:${questionId}:${second.id}`;
    return left.localeCompare(right);
  });
}

function questionOptions(question: PlayQuestion, room: Room) {
  const options =
    question.type === "true-false" && !question.options.length
      ? [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ]
      : question.options;
  return room.settings.shuffleOptions ? stableOptionOrder(options, room.id, question.id) : options;
}

export function LiveRoomPlayer({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading, authReady } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [answers, setAnswers] = useState<RoomAnswer[]>([]);
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [answer, setAnswer] = useState<QuizAnswerState>(emptyAnswer());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const roomId = room?.id;
  const roomQuizId = room?.quizId;
  const currentQuestionIndex = room?.currentQuestionIndex ?? 0;

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = listenRoomByCode(
      roomCode,
      (nextRoom) => {
        setRoom(nextRoom);
        setLoading(false);
        if (nextRoom?.status === "waiting") router.replace(`/rooms/${nextRoom.roomCode}`);
        if (nextRoom?.status === "completed") router.replace(`/rooms/${nextRoom.roomCode}/result`);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [roomCode, router, user]);

  useEffect(() => {
    if (!room) return;
    return listenRoomPlayers(room.id, setPlayers, setError);
  }, [room]);

  useEffect(() => {
    let mounted = true;
    if (!room || !user) return;
    setQuestionsLoading(true);
    fetchSafeRoomQuestionsClient(user, room.id)
      .then(({ questions: nextQuestions }) => {
        if (mounted) setQuestions(nextQuestions);
      })
      .catch((caught) => {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load room questions.");
        }
      })
      .finally(() => {
        if (mounted) setQuestionsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [room, roomId, roomQuizId, user]);

  useEffect(() => {
    if (!room) return;
    return listenRoomAnswers(room.id, room.currentQuestionIndex, setAnswers, setError);
  }, [currentQuestionIndex, room, roomId]);

  useEffect(() => {
    if (!room?.questionEndsAt) {
      setRemainingSeconds(0);
      return;
    }
    const tick = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((new Date(room.questionEndsAt || Date.now()).getTime() - Date.now()) / 1000))
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [room?.questionEndsAt]);

  useEffect(() => {
    setAnswer(emptyAnswer());
  }, [room?.currentQuestionIndex]);

  const currentPlayer = players.find((player) => player.userId === user?.uid) ?? null;
  const isHost = room?.hostId === user?.uid;
  const activePlayers = useMemo(
    () => players.filter((player) => player.status !== "left" && player.status !== "disconnected"),
    [players]
  );
  const botPlayers = useMemo(
    () => activePlayers.filter((player) => player.isBot),
    [activePlayers]
  );
  const currentQuestion = room ? questions[room.currentQuestionIndex] : null;
  const submitted = answers.some((item) => item.userId === user?.uid);
  const answeredCount = answers.length;
  const canAdvance = Boolean(
    isHost &&
      room &&
      currentQuestion &&
      (remainingSeconds <= 0 || answeredCount >= activePlayers.length)
  );
  const scoreboard = useMemo(
    () =>
      [...activePlayers].sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return second.correctCount - first.correctCount;
      }),
    [activePlayers]
  );

  useEffect(() => {
    if (!room || !user || !currentPlayer) return;
    const update = () => {
      updatePlayerHeartbeat(room.id, user.uid).catch(() => null);
    };
    update();
    const interval = window.setInterval(update, 30000);
    return () => window.clearInterval(interval);
  }, [currentPlayer, room, user]);

  useEffect(() => {
    if (!room || !isHost || !currentQuestion || room.status !== "in-progress") return;
    if (!user) return;
    const hostUser = user;
    const answeredBotIds = new Set(answers.filter((item) => item.isBot).map((item) => item.userId));
    const timers = botPlayers
      .filter((bot) => !answeredBotIds.has(bot.userId))
      .map((bot) =>
        window.setTimeout(() => {
          submitTrustedRoomAnswerClient({
            user: hostUser,
            roomId: room.id,
            questionIndex: room.currentQuestionIndex,
            botUserId: bot.userId
          }).catch(() => null);
        }, botAnswerDelayMs(room, bot, currentQuestion.id))
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [answers, botPlayers, currentQuestion, isHost, room, user]);

  async function submitAnswer() {
    if (!room || !currentQuestion || !user || submitted || working) return;
    setWorking(true);
    try {
      await submitTrustedRoomAnswerClient({
        user,
        roomId: room.id,
        questionIndex: room.currentQuestionIndex,
        answer
      });
      showToast({ tone: "success", title: "Answer locked", description: "Waiting for the round to advance." });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Answer was not submitted",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function advanceQuestion() {
    if (!room || !user || !canAdvance || working) return;
    setWorking(true);
    try {
      await finalizeTrustedRoomQuestionClient({ user, roomId: room.id });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not advance",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function cancelActiveRoom() {
    if (!room || !isHost || working) return;
    setWorking(true);
    try {
      await cancelRoom(room.id);
      showToast({
        tone: "success",
        title: "Room cancelled",
        description: "The live room is now closed for all players."
      });
      router.replace("/rooms");
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not cancel room",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  function toggleOption(optionId: string) {
    if (!currentQuestion || submitted || working) return;
    setAnswer((current) => {
      if (currentQuestion.type === "multiple-choice") {
        const selected = current.selectedAnswers.includes(optionId)
          ? current.selectedAnswers.filter((id) => id !== optionId)
          : [...current.selectedAnswers, optionId];
        return { ...current, selectedAnswers: selected, selectedAnswer: "" };
      }
      return { ...current, selectedAnswer: optionId, selectedAnswers: [] };
    });
  }

  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Database} title="Firebase setup is required" description={firebaseSetupMessage} />
      </div>
    );
  }

  if (authLoading || loading || questionsLoading) {
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
          title="Sign in to play this room"
          description="Live rooms are login-required so your score, podium result, and profile progress can be saved."
          actionHref={`/login?next=${encodeURIComponent(`/rooms/${roomCode}/play`)}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Room unavailable"
          description={error || "The room is missing or closed."}
          actionHref="/rooms"
          actionLabel="Back to rooms"
        />
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={LockKeyhole}
          title="Join the lobby first"
          description="Only joined players can enter the live quiz arena."
          actionHref={`/rooms/${room.roomCode}`}
          actionLabel="Go to lobby"
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Question unavailable"
          description="The room question list could not be loaded."
          actionHref={`/rooms/${room.roomCode}`}
          actionLabel="Back to lobby"
        />
      </div>
    );
  }

  const options = questionOptions(currentQuestion, room);
  const progress = Math.round(((room.currentQuestionIndex + 1) / questions.length) * 100);
  const lowTime = remainingSeconds <= 10;

  return (
    <section className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_21rem]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge className="text-primary">Room {room.roomCode}</Badge>
              <h1 className="mt-3 text-3xl font-semibold">{room.quizTitle}</h1>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 font-semibold",
                lowTime && "border-danger/35 bg-danger/10 text-danger"
              )}
              aria-live="polite"
            >
              <Clock3 className="size-4" />
              {formatClock(remainingSeconds)}
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Question {room.currentQuestionIndex + 1} of {questions.length} •{" "}
            {answeredCount}/{activePlayers.length} submitted
          </p>
        </Card>

        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            initial={{ opacity: 0, y: 14 }}
            key={currentQuestion.id}
            transition={{ duration: 0.25 }}
          >
            <Card className="p-6">
              <p className="text-sm font-semibold uppercase text-primary">
                {currentQuestion.type.replace("-", " ")}
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold">
                {currentQuestion.questionText}
              </h2>
              {currentQuestion.imageUrl ? (
                <ImageDisplay
                  alt={currentQuestion.imageAlt || currentQuestion.questionText}
                  caption={currentQuestion.imageCaption}
                  className="mt-5"
                  imageClassName="max-h-72"
                  src={currentQuestion.imageUrl}
                />
              ) : null}
              <div className="mt-6 grid gap-3">
                {currentQuestion.type === "text" ? (
                  <Textarea
                    disabled={submitted || working}
                    onChange={(event) =>
                      setAnswer((current) => ({ ...current, textAnswer: event.target.value }))
                    }
                    placeholder="Type your answer"
                    value={answer.textAnswer}
                  />
                ) : (
                  options.map((option) => {
                    const selected =
                      currentQuestion.type === "multiple-choice"
                        ? answer.selectedAnswers.includes(option.id)
                        : answer.selectedAnswer === option.id;
                    return (
                      <button
                        className={cn(
                          "flex items-center justify-between rounded-3xl border border-border bg-surface/75 p-4 text-left font-semibold transition hover:-translate-y-0.5 hover:border-primary/45",
                          selected && "border-primary/50 bg-primary/12 text-primary"
                        )}
                        disabled={submitted || working}
                        key={option.id}
                        onClick={() => toggleOption(option.id)}
                        type="button"
                      >
                        <span className="min-w-0 flex-1">
                          {option.imageUrl ? (
                            <ImageDisplay
                              alt={option.imageAlt || option.text}
                              className="mb-3 rounded-2xl"
                              compact
                              imageClassName="max-h-40"
                              src={option.imageUrl}
                            />
                          ) : null}
                          <span>{option.text || option.imageAlt || option.id}</span>
                        </span>
                        {selected ? <Check className="size-5" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {submitted ? "Answer locked. Waiting for host advancement." : "Correct answers stay hidden until review."}
                </p>
                <Button
                  disabled={submitted || working || !hasLocalAnswer(answer)}
                  icon={working ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  onClick={() => void submitAnswer()}
                >
                  Submit Answer
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
        <Card className="p-5">
          <Trophy className="size-8 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">Live scoreboard</h2>
          <div className="mt-5 grid gap-3">
            {scoreboard.slice(0, 8).map((player, index) => (
              <div
                className={cn(
                  "flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface/70 p-3",
                  player.userId === user.uid && "border-primary/40 bg-primary/10"
                )}
                key={player.id}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-primary">#{index + 1}</span>
                  <UserAvatar name={player.displayName} size="sm" src={player.photoURL} />
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {player.displayName}
                      {player.isBot ? (
                        <Badge>
                          <Bot className="mr-1 size-3" />
                          Bot
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{player.correctCount} correct</p>
                  </div>
                </div>
                <Badge>{player.score}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {isHost ? (
          <Card className="p-5">
            <Crown className="size-8 text-primary" />
            <h2 className="mt-3 text-2xl font-semibold">Host controls</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Advance after all players submit or the timer expires.
            </p>
            <Button
              className="mt-5"
              disabled={!canAdvance || working}
              fullWidth
              onClick={() => void advanceQuestion()}
            >
              {working ? <Loader2 className="size-4 animate-spin" /> : null}
              {room.currentQuestionIndex >= questions.length - 1 ? "Finish Room" : "Next Question"}
            </Button>
            <Button
              className="mt-3"
              disabled={working}
              fullWidth
              onClick={() => void cancelActiveRoom()}
              variant="danger"
            >
              Cancel Room
            </Button>
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Round settings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatSeconds(room.settings.questionTimerSeconds)} per question •{" "}
            {room.settings.scoringMode === "speed-bonus" ? "Speed bonus" : "Standard scoring"}
          </p>
        </Card>
      </div>
    </section>
  );
}
