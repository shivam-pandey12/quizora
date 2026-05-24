"use client";

import { Database, DoorOpen, LockKeyhole, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listUserRoomHistory } from "@/lib/firestore/rooms";
import { formatDate } from "@/lib/firestore/timestamps";
import type { Room, RoomResult } from "@/types/domain";

export function RoomHistory() {
  const { user, loading: authLoading, authReady } = useAuth();
  const [results, setResults] = useState<RoomResult[]>([]);
  const [hostedRooms, setHostedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured || !user) {
      setLoading(false);
      return;
    }
    const currentUser = user;

    async function loadHistory() {
      setLoading(true);
      try {
        const history = await listUserRoomHistory(currentUser.uid, 16);
        if (!mounted) return;
        setResults(history.results);
        setHostedRooms(history.hostedRooms);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load room history.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      mounted = false;
    };
  }, [user]);

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
          title="Sign in to view room history"
          description="Room history is private to your signed-in Quizora profile."
          actionHref={`/login?next=${encodeURIComponent("/rooms/history")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Live room history"
        title="Your multiplayer timeline"
        description="Review rooms you hosted, rooms you completed, final ranks, and live-room attempt links."
      />
      <section className="container-page space-y-8 pb-16">
        {error ? <EmptyState icon={Database} title="History could not load" description={error} /> : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Played rooms</p>
                <h2 className="mt-2 text-2xl font-semibold">Completed live results</h2>
              </div>
              <Badge>{results.length} loaded</Badge>
            </div>
            {results.length ? (
              <div className="mt-5 grid gap-3">
                {results.map((result) => (
                  <div className="rounded-3xl border border-border bg-surface/70 p-4" key={result.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Badge className="text-primary">#{result.rank} • {result.roomCode}</Badge>
                        <h3 className="mt-3 text-xl font-semibold">{result.score}/{result.totalPoints} points</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {result.accuracy}% accuracy • {formatDate(result.completedAt)}
                        </p>
                      </div>
                      <Button href={`/rooms/${result.roomCode}/result`} size="sm" variant="secondary">
                        View Result
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  icon={Trophy}
                  title="No completed live rooms yet"
                  description="Finish a live room to see podium history here."
                  actionHref="/rooms"
                  actionLabel="Find Rooms"
                />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Hosted rooms</p>
                <h2 className="mt-2 text-2xl font-semibold">Rooms you created</h2>
              </div>
              <Badge>{hostedRooms.length} loaded</Badge>
            </div>
            {hostedRooms.length ? (
              <div className="mt-5 grid gap-3">
                {hostedRooms.map((room) => (
                  <div className="rounded-3xl border border-border bg-surface/70 p-4" key={room.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Badge>{room.status}</Badge>
                        <h3 className="mt-3 text-xl font-semibold">{room.roomTitle || room.quizTitle}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {room.roomCode} • {room.playerCount}/{room.maxPlayers} players • {formatDate(room.createdAt)}
                        </p>
                      </div>
                      <Button href={`/rooms/${room.roomCode}`} size="sm" variant="secondary">
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  icon={DoorOpen}
                  title="No hosted rooms yet"
                  description="Create a public or private room to build your host history."
                  actionHref="/rooms/create"
                  actionLabel="Create Room"
                />
              </div>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
