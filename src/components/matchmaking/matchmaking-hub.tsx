"use client";

import { Bot, Database, DoorOpen, LockKeyhole, RadioTower, Search, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { getActiveQueueEntry } from "@/lib/firestore/matchmaking";
import { listPublicWaitingRooms } from "@/lib/firestore/rooms";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { MatchmakingQueueEntry, Room } from "@/types/domain";

function sourceLabel(source: Room["source"]) {
  if (source === "quick-match") return "Quick Match";
  if (source === "challenge") return "Challenge";
  return "Manual";
}

export function MatchmakingHub() {
  const { user, loading, authReady } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [queue, setQueue] = useState<MatchmakingQueueEntry | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured || !user) {
      setRoomsLoading(false);
      return;
    }
    const currentUser = user;

    async function load() {
      setRoomsLoading(true);
      try {
        const [nextRooms, nextQueue] = await Promise.all([
          listPublicWaitingRooms({ count: 24, source: "quick-match", availableOnly: true }),
          getActiveQueueEntry(currentUser.uid)
        ]);
        if (!mounted) return;
        setRooms(nextRooms);
        setQueue(nextQueue);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load matchmaking.");
      } finally {
        if (mounted) setRoomsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const filteredRooms = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rooms.filter((room) =>
      !normalized ||
      [room.roomCode, room.quizTitle, room.hostName, room.categoryName, room.roomTitle].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [rooms, search]);

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
          title="Sign in to use matchmaking"
          description="Quick Match uses your profile identity for room joins, bot-safe scoring, and saved live-room results."
          actionHref={`/login?next=${encodeURIComponent("/matchmaking")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Matchmaking"
        title="Find a live quiz room fast"
        description="Quick Match searches compatible public rooms first, then creates a casual room with optional bot fill if nobody is available."
      />
      <section className="container-page space-y-8 pb-16">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
            <div className="relative">
              <Sparkles className="size-9 text-primary" />
              <h2 className="mt-4 text-3xl font-semibold">Quick Match</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose a quiz preference, target player count, timer, and bot-fill option. Quizora handles room matching without changing the live-room engine.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/matchmaking/quick">Find Match</Button>
                <Button href="/rooms" variant="secondary">
                  Browse Rooms
                </Button>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <RadioTower className="size-9 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">Current queue</h2>
            {queue && queue.status === "searching" ? (
              <>
                <Badge className="mt-4 text-primary">Searching</Badge>
                <p className="mt-3 text-sm text-muted-foreground">
                  {queue.preferredQuizId ? "Specific quiz" : "Flexible quiz"} •{" "}
                  {queue.preferredPlayerCount === "flexible" ? "Flexible players" : `${queue.preferredPlayerCount} players`}
                </p>
                <Button className="mt-5" href="/matchmaking/status" variant="secondary">
                  View Status
                </Button>
              </>
            ) : queue?.matchedRoomCode ? (
              <>
                <Badge className="mt-4 text-primary">Matched</Badge>
                <p className="mt-3 text-sm text-muted-foreground">
                  Room {queue.matchedRoomCode} is ready for you.
                </p>
                <Button className="mt-5" href={`/rooms/${queue.matchedRoomCode}`} variant="secondary">
                  Enter Lobby
                </Button>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No active queue. Start a Quick Match when you want the fastest live-room path.
              </p>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Open quick rooms</p>
              <h2 className="mt-2 text-2xl font-semibold">Matchmaking rooms</h2>
            </div>
            <Badge>
              <Bot className="mr-2 size-3.5" />
              Bot fill ready
            </Badge>
          </div>
          <label className="relative mt-5 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-11"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by quiz, host, category, or room code"
              value={search}
            />
          </label>

          {roomsLoading ? <LoadingSkeleton variant="card" /> : null}
          {error ? <EmptyState icon={Database} title="Matchmaking rooms could not load" description={error} /> : null}
          {!roomsLoading && !error && filteredRooms.length ? (
            <div className="mt-5 grid gap-3">
              {filteredRooms.map((room) => (
                <div
                  className="grid gap-4 rounded-3xl border border-border bg-surface/70 p-4 md:grid-cols-[1fr_auto] md:items-center"
                  key={room.id}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={room.hostName} size="md" src={room.hostPhotoURL} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{room.roomTitle || room.quizTitle}</h3>
                        <Badge>{sourceLabel(room.source)}</Badge>
                        {room.allowBotFill ? <Badge>Bot fill</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {room.roomCode} • {room.quizTitle} • {room.categoryName}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {room.playerCount}/{room.maxPlayers} players • Min {room.minPlayersToStart} •{" "}
                        {formatSeconds(room.settings.questionTimerSeconds)} • {titleCase(room.difficulty)}
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={room.playerCount >= room.maxPlayers || room.locked}
                    href={room.playerCount >= room.maxPlayers || room.locked ? undefined : `/rooms/${room.roomCode}`}
                    size="sm"
                    variant="secondary"
                  >
                    {room.locked ? "Locked" : room.playerCount >= room.maxPlayers ? "Full" : "Join"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {!roomsLoading && !error && !filteredRooms.length ? (
            <div className="mt-5">
              <EmptyState
                icon={UsersRound}
                title="No matchmaking rooms waiting"
                description="Start Quick Match to create a compatible public room."
                actionHref="/matchmaking/quick"
                actionLabel="Find Match"
              />
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Room history</p>
              <h2 className="mt-2 text-2xl font-semibold">Review past live matches</h2>
            </div>
            <Button href="/rooms/history" icon={<DoorOpen className="size-4" />} variant="secondary">
              Room History
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
