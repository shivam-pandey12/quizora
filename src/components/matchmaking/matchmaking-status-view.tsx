"use client";

import { AlertTriangle, Database, Loader2, LockKeyhole, RadioTower, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { cancelQueue, listenQueueEntry } from "@/lib/firestore/matchmaking";
import type { MatchmakingQueueEntry } from "@/types/domain";

function queueSeconds(queue: MatchmakingQueueEntry | null) {
  if (!queue?.createdAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(queue.createdAt).getTime()) / 1000));
}

export function MatchmakingStatusView({ matchedRoomCode }: { matchedRoomCode?: string }) {
  const { user, loading, authReady } = useAuth();
  const { showToast } = useToast();
  const [queue, setQueue] = useState<MatchmakingQueueEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    return listenQueueEntry(
      user.uid,
      (nextQueue) => {
        setQueue(nextQueue);
        setError(null);
      },
      setError
    );
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(queueSeconds(queue)), 1000);
    setElapsed(queueSeconds(queue));
    return () => window.clearInterval(interval);
  }, [queue]);

  const roomCode = matchedRoomCode || queue?.matchedRoomCode || "";
  const statusText = useMemo(() => {
    if (roomCode) return `Room ${roomCode} is ready.`;
    if (!queue) return "No active queue was found.";
    if (queue.status === "searching") return "Searching compatible rooms and keeping your queue warm.";
    if (queue.status === "cancelled") return "This queue was cancelled.";
    if (queue.status === "expired") return "This queue expired. Start a fresh Quick Match.";
    return "Matched room is being prepared.";
  }, [queue, roomCode]);

  async function cancelCurrentQueue() {
    if (!user || working) return;
    setWorking(true);
    try {
      await cancelQueue(user.uid);
      showToast({ tone: "success", title: "Queue cancelled", description: "You can start a fresh search anytime." });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not cancel queue",
        description: caught instanceof Error ? caught.message : "Try again."
      });
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
          icon={LockKeyhole}
          title="Sign in to view matchmaking"
          description="Queue status is private to your signed-in profile."
          actionHref={`/login?next=${encodeURIComponent("/matchmaking/status")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={AlertTriangle} title="Queue could not load" description={error} />
      </div>
    );
  }

  return (
    <section className="relative min-h-[70vh] overflow-hidden py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
      <div className="absolute inset-0 premium-grid opacity-45" />
      <div className="container-page relative grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
        <Card className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute right-8 top-8 size-28 rounded-full border border-primary/25" />
          <div className="pointer-events-none absolute right-16 top-16 size-16 rounded-full border border-primary/20" />
          <RadioTower className="size-10 text-primary" />
          <Badge className="mt-5 text-primary">{roomCode ? "Match found" : queue?.status ?? "No queue"}</Badge>
          <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-6xl">
            {roomCode ? "Your room is ready." : "Searching the arena."}
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground">{statusText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {roomCode ? (
              <Button href={`/rooms/${roomCode}`} icon={<Sparkles className="size-4" />}>
                Enter Lobby
              </Button>
            ) : null}
            {!roomCode && queue?.status === "searching" ? (
              <Button disabled={working} onClick={() => void cancelCurrentQueue()} variant="danger">
                {working ? <Loader2 className="size-4 animate-spin" /> : null}
                Cancel Search
              </Button>
            ) : null}
            <Button href="/matchmaking/quick" variant="secondary">
              Start Fresh
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <Sparkles className="size-8 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold">Queue snapshot</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl border border-border bg-surface/70 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Elapsed</p>
              <p className="mt-1 text-xl font-semibold">{elapsed}s</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/70 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Players</p>
              <p className="mt-1 text-xl font-semibold">
                {queue?.preferredPlayerCount === "flexible" ? "Flexible" : queue?.preferredPlayerCount ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/70 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bot fill</p>
              <p className="mt-1 text-xl font-semibold">{queue?.allowBotFill ? "Allowed" : "Off"}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
