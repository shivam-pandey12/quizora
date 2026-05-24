"use client";

import { AlertTriangle, Copy, Database, LockKeyhole, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { getChallenge, joinChallenge } from "@/lib/firestore/challenges";
import type { Challenge } from "@/types/domain";

export function ChallengeView({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const { user, profile, loading: authLoading, authReady } = useAuth();
  const { showToast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const nextChallenge = await getChallenge(challengeId);
        if (mounted) setChallenge(nextChallenge);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load challenge.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  async function copyChallenge() {
    const link = `${window.location.origin}/rooms/challenge/${challengeId}`;
    await navigator.clipboard.writeText(link);
    showToast({ tone: "success", title: "Challenge link copied", description: "Send it to another player." });
  }

  async function joinCurrentChallenge() {
    if (!challenge || !user || working) return;
    setWorking(true);
    try {
      const roomCode = await joinChallenge({ challenge, user, profile });
      showToast({ tone: "success", title: "Challenge joined", description: `Entering room ${roomCode}.` });
      router.push(`/rooms/${roomCode}`);
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not join challenge",
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
          title="Sign in to accept this challenge"
          description="Challenge links are login-required so the lobby can use your real Quizora profile."
          actionHref={`/login?next=${encodeURIComponent(`/rooms/challenge/${challengeId}`)}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Challenge unavailable"
          description={error || "This challenge link is missing, expired, or unavailable."}
          actionHref="/rooms"
          actionLabel="Back to rooms"
        />
      </div>
    );
  }

  const expired = challenge.expiresAt ? new Date(challenge.expiresAt).getTime() < Date.now() : false;
  const unavailable = expired || challenge.status === "expired" || challenge.status === "cancelled";

  return (
    <section className="relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
      <div className="absolute inset-0 premium-grid opacity-45" />
      <div className="container-page relative">
        <Card className="mx-auto max-w-3xl p-7">
          <Swords className="size-10 text-primary" />
          <Badge className="mt-5 text-primary">
            {unavailable ? "Unavailable" : "Challenge invite"}
          </Badge>
          <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-6xl">
            {challenge.createdByName} challenged you.
          </h1>
          <p className="mt-5 text-muted-foreground">
            Join a private live room for <strong className="text-foreground">{challenge.quizTitle}</strong>.
            The room code is {challenge.roomCode}; correct answers stay hidden until room review.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-border bg-surface/70 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Room</p>
              <p className="mt-2 text-2xl font-semibold">{challenge.roomCode}</p>
            </div>
            <div className="rounded-3xl border border-border bg-surface/70 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
              <p className="mt-2 text-2xl font-semibold">{challenge.status}</p>
            </div>
            <div className="rounded-3xl border border-border bg-surface/70 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Expires</p>
              <p className="mt-2 text-2xl font-semibold">
                {challenge.expiresAt ? new Date(challenge.expiresAt).toLocaleDateString() : "--"}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button disabled={unavailable || working} icon={<Trophy className="size-4" />} onClick={() => void joinCurrentChallenge()}>
              Join Challenge
            </Button>
            <Button icon={<Copy className="size-4" />} onClick={() => void copyChallenge()} variant="secondary">
              Copy Link
            </Button>
            <Button href="/rooms" variant="ghost">
              Back to Rooms
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
