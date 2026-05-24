"use client";

import { Database, DoorOpen, Loader2, LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";
import { joinRoomByCode } from "@/lib/firestore/rooms";

export function JoinRoomForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, loading, authReady } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setWorking(true);
    setError(null);
    try {
      const code = await joinRoomByCode({ roomCode, user, profile });
      showToast({ tone: "success", title: "Joined room", description: `Entering ${code}.` });
      router.push(`/rooms/${code}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not join room.";
      setError(message);
      showToast({ tone: "error", title: "Join failed", description: message });
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
          title="Sign in to join a live room"
          description="Live rooms require a player profile so scoreboards and results stay clean."
          actionHref={`/login?next=${encodeURIComponent("/rooms/join")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Join live"
        title="Enter your room code"
        description="Room codes are six characters, case-insensitive, and shown in the host lobby."
      />
      <section className="container-page pb-16">
        <Card className="mx-auto max-w-xl p-6 text-center">
          <DoorOpen className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-3xl font-semibold">Ready to enter?</h2>
          <form className="mt-6 grid gap-4" onSubmit={handleJoin}>
            <label className="grid gap-2 text-left">
              <span className="text-sm font-semibold">Room code</span>
              <Input
                className="h-16 text-center text-3xl font-semibold uppercase tracking-[0.2em]"
                maxLength={8}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="QH7K2P"
                value={roomCode}
              />
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button disabled={working || roomCode.trim().length < 4} type="submit">
              {working ? <Loader2 className="size-4 animate-spin" /> : null}
              Join Room
            </Button>
            <Button href="/rooms" variant="secondary">
              Back to rooms
            </Button>
          </form>
        </Card>
      </section>
    </>
  );
}
