"use client";

import { AlertTriangle, Bot, Copy, Crown, Database, LockKeyhole, Medal, Swords, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { createChallengeForQuiz } from "@/lib/firestore/challenges";
import {
  createRematchRoom,
  listenRoomByCode,
  listenRoomResults
} from "@/lib/firestore/rooms";
import { ensureTrustedRoomAttemptClient } from "@/lib/trusted/client";
import { formatNumber } from "@/lib/utils";
import type { Room, RoomResult } from "@/types/domain";

function podiumTone(rank: number) {
  if (rank === 1) return "from-amber-200 via-stone-100 to-yellow-100";
  if (rank === 2) return "from-slate-100 via-stone-100 to-sky-100";
  return "from-orange-100 via-stone-100 to-amber-100";
}

export function RoomResultView({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { user, profile, loading: authLoading, authReady, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [rematchWorking, setRematchWorking] = useState(false);
  const [challengeWorking, setChallengeWorking] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setLoading(false);
      return;
    }
    return listenRoomByCode(
      roomCode,
      (nextRoom) => {
        setRoom(nextRoom);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
  }, [roomCode, user]);

  useEffect(() => {
    if (!room) return;
    return listenRoomResults(room.id, setResults, setError);
  }, [room]);

  const currentResult = results.find((result) => result.userId === user?.uid) ?? null;
  const podium = results.slice(0, 3);
  const isHost = room?.hostId === user?.uid;

  useEffect(() => {
    if (!user || !room || !currentResult || savingAttempt || attemptId) return;
    if (room.status !== "completed") return;
    setSavingAttempt(true);
    ensureTrustedRoomAttemptClient({ user, roomId: room.id })
      .then(async ({ attemptId: nextAttemptId }) => {
        setAttemptId(nextAttemptId);
        await refreshProfile().catch(() => null);
      })
      .catch((caught) => {
        showToast({
          tone: "error",
          title: "Room result saved, attempt pending",
          description:
            caught instanceof Error
              ? caught.message
              : "Open this page again to retry your profile attempt save."
        });
      })
      .finally(() => setSavingAttempt(false));
  }, [attemptId, currentResult, profile, refreshProfile, room, savingAttempt, showToast, user]);

  const shareText = useMemo(() => {
    if (!room || !currentResult) return "";
    const quizLink = typeof window !== "undefined" ? `${window.location.origin}/quizzes/${room.quizSlug}` : "";
    return `I placed #${currentResult.rank} with ${currentResult.score}/${currentResult.totalPoints} on ${room.quizTitle} in a Quizora live room. Try the quiz: ${quizLink}`;
  }, [currentResult, room]);

  async function shareResult() {
    if (!shareText) return;
    if (navigator.share) {
      await navigator.share({ title: "Quizora live result", text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast({ tone: "success", title: "Result copied", description: "Challenge text copied." });
    }
  }

  async function createRematch() {
    if (!room || !user || !isHost || rematchWorking) return;
    setRematchWorking(true);
    try {
      const nextCode = await createRematchRoom({ user, profile, room });
      showToast({
        tone: "success",
        title: "Rematch created",
        description: `New room code ${nextCode} is ready.`
      });
      router.push(`/rooms/${nextCode}`);
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not create rematch",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setRematchWorking(false);
    }
  }

  async function createChallenge() {
    if (!room || !user || challengeWorking) return;
    setChallengeWorking(true);
    try {
      const challenge = await createChallengeForQuiz({
        user,
        profile,
        quizId: room.quizId,
        quizTitle: room.quizTitle,
        scoringMode: room.settings.scoringMode
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

  if (!authReady) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Database} title="Firebase setup is required" description={firebaseSetupMessage} />
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
          title="Sign in to view room results"
          description="Live room results are private to participants."
          actionHref={`/login?next=${encodeURIComponent(`/rooms/${roomCode}/result`)}`}
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
          title="Results unavailable"
          description={error || "This room result could not be found."}
          actionHref="/rooms"
          actionLabel="Back to rooms"
        />
      </div>
    );
  }

  return (
    <section className="container-page space-y-8 py-10">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <Badge className="text-primary">Final podium • {room.roomCode}</Badge>
            <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-6xl">
              {room.quizTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Live-room results are saved as room results, and each signed-in participant saves a normal live-room attempt for their dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{room.analytics.completedPlayerCount || results.length} completed</Badge>
              <Badge>{room.analytics.averageAccuracy}% avg accuracy</Badge>
              <Badge>{room.analytics.durationSeconds}s duration</Badge>
              {room.antiAbuse.flags.length ? <Badge>Admin review suggested</Badge> : null}
            </div>
          </div>
          {currentResult ? (
            <div className="rounded-3xl border border-border bg-surface/80 p-5 text-center shadow-sm">
              <Trophy className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm font-semibold uppercase text-primary">Your rank</p>
              <p className="mt-1 text-5xl font-semibold">#{currentResult.rank}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {currentResult.accuracy}% accuracy • +{currentResult.xpEarned} XP
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {podium.length ? (
        <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
          {podium.map((result, index) => (
            <motion.article
              animate={{ opacity: 1, y: 0 }}
              className={index === 0 ? "lg:order-2 lg:-translate-y-5" : index === 1 ? "lg:order-1 lg:translate-y-5" : "lg:order-3 lg:translate-y-8"}
              initial={{ opacity: 0, y: 18 }}
              key={result.id}
              transition={{ delay: index * 0.08, duration: 0.35 }}
            >
              <Card className="relative overflow-hidden p-6 text-center">
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${podiumTone(result.rank)} opacity-80 dark:opacity-15`} />
                <div className="relative">
                  <UserAvatar
                    className="mx-auto"
                    name={result.displayName}
                    size="lg"
                    src={result.photoURL}
                  />
                  <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    {result.rank === 1 ? <Crown className="size-6" /> : <Medal className="size-6" />}
                  </span>
                  <p className="mt-4 text-sm font-semibold uppercase text-primary">Rank #{result.rank}</p>
                  <h2 className="mt-2 text-3xl font-semibold">{result.displayName}</h2>
                  {result.isBot ? (
                    <Badge className="mt-3">
                      <Bot className="mr-1 size-3.5" />
                      Bot
                    </Badge>
                  ) : null}
                  <p className="mt-4 text-4xl font-semibold">{formatNumber(result.score)}</p>
                  <Badge className="mt-4">{result.accuracy}% accuracy</Badge>
                </div>
              </Card>
            </motion.article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Results are still being prepared"
          description="The host needs to finish the room before podium results appear."
          actionHref={`/rooms/${room.roomCode}/play`}
          actionLabel="Back to room"
        />
      )}

      {results.length ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Full ranking</p>
              <h2 className="mt-2 text-2xl font-semibold">Room scoreboard</h2>
            </div>
            <div className="flex gap-2">
              {attemptId ? (
                <Button href={`/result/${attemptId}`} variant="secondary">
                  Open Attempt
                </Button>
              ) : null}
              <Button icon={<Copy className="size-4" />} onClick={() => void shareResult()}>
                Share Result
              </Button>
              <Button
                disabled={challengeWorking}
                icon={<Swords className="size-4" />}
                onClick={() => void createChallenge()}
                variant="secondary"
              >
                Challenge Friends
              </Button>
              {isHost ? (
                <Button disabled={rematchWorking} onClick={() => void createRematch()} variant="secondary">
                  Create Rematch
                </Button>
              ) : null}
              <Button href="/rooms" variant="ghost">
                Back to Rooms
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <div
                className="grid gap-3 rounded-3xl border border-border bg-surface/70 p-4 md:grid-cols-[4rem_1fr_auto] md:items-center"
                key={result.id}
              >
                <p className="text-2xl font-semibold text-primary">#{result.rank}</p>
                <div className="flex items-center gap-3">
                  <UserAvatar name={result.displayName} size="md" src={result.photoURL} />
                  <div>
                    <p className="font-semibold">{result.displayName}</p>
                    {result.isBot ? <Badge className="mt-1">Bot opponent</Badge> : null}
                    <p className="text-sm text-muted-foreground">
                      {result.correctCount} correct • {result.wrongCount} wrong • {result.skippedCount} skipped
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Badge>{result.score}/{result.totalPoints} pts</Badge>
                  <Badge>{result.accuracy}%</Badge>
                  <Badge>+{result.xpEarned} XP</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
