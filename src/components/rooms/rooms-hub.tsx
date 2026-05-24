"use client";

import {
  Clock3,
  Database,
  DoorOpen,
  History,
  PlusCircle,
  RadioTower,
  Search,
  Sparkles,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicWaitingRooms } from "@/lib/firestore/rooms";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { Room, RoomSource } from "@/types/domain";

function sourceLabel(source: RoomSource) {
  if (source === "quick-match") return "Quick Match";
  if (source === "challenge") return "Challenge";
  if (source === "class-room") return "Class Room";
  return "Manual";
}

export function RoomsHub() {
  const { user, authReady, loading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState<RoomSource | "all">("all");
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured || !user) {
      setRoomsLoading(false);
      return;
    }

    async function loadRooms() {
      setRoomsLoading(true);
      try {
        const nextRooms = await listPublicWaitingRooms({ count: 30 });
        if (mounted) setRooms(nextRooms);
      } catch (caught) {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load live rooms.");
        }
      } finally {
        if (mounted) setRoomsLoading(false);
      }
    }

    void loadRooms();
    return () => {
      mounted = false;
    };
  }, [user]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Map(rooms.map((room) => [room.categoryId, room.categoryName])).entries()
      ).filter(([id]) => Boolean(id)),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesSearch =
        !normalized ||
        [
          room.roomCode,
          room.roomTitle,
          room.roomDescription,
          room.quizTitle,
          room.hostName,
          room.categoryName
        ].some((value) => value.toLowerCase().includes(normalized));
      const matchesCategory = categoryId === "all" || room.categoryId === categoryId;
      const matchesDifficulty = difficulty === "all" || room.difficulty === difficulty;
      const matchesSource = source === "all" || room.source === source;
      const hasSpot = !availableOnly || room.playerCount < room.maxPlayers;
      return matchesSearch && matchesCategory && matchesDifficulty && matchesSource && hasSpot;
    });
  }, [availableOnly, categoryId, difficulty, rooms, search, source]);

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
      <>
        <PageHeader
          eyebrow="Live quiz rooms"
          title="Create, share, and compete in real-time quiz rooms"
          description="Quizora live rooms bring room codes, premium lobbies, synced questions, scoreboards, and final podiums into one polished multiplayer quiz flow."
        />
        <section className="container-page grid gap-5 pb-16 md:grid-cols-3">
          {[
            ["Host rooms", "Create private or public quiz rooms from published quizzes."],
            ["Invite players", "Share a room code or invite link for a synchronized lobby."],
            ["Save results", "Completed room results can feed attempts, XP, and progress."]
          ].map(([title, description]) => (
            <Card className="p-5" key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </section>
        <section className="container-page pb-16">
          <EmptyState
            icon={DoorOpen}
            title="Sign in to enter live rooms"
            description="Live rooms use your profile identity for hosting, joining, scoring, podiums, and saved results."
            actionHref={`/login?next=${encodeURIComponent("/rooms")}`}
            actionLabel="Sign in"
          />
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Live rooms"
        title="Host a real-time quiz arena"
        description="Create a private room, invite players with a code, and run synchronized quiz rounds with live scoring."
      />
      <section className="container-page space-y-8 pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
            <div className="relative">
              <PlusCircle className="size-9 text-primary" />
              <h2 className="mt-4 text-3xl font-semibold">Create a room</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Pick a published quiz, tune the timer, and bring players into a polished lobby.
              </p>
            <Button className="mt-6" href="/rooms/create">
                Create Room
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <RadioTower className="size-9 text-primary" />
            <h2 className="mt-4 text-3xl font-semibold">Join with code</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter a six-character room code and jump into the lobby with your profile identity.
            </p>
            <Button className="mt-6" href="/rooms/join" variant="secondary">
              Join Room
            </Button>
          </Card>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Quick Match</p>
              <h2 className="mt-2 text-2xl font-semibold">Let Quizora find a compatible lobby</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Quick Match searches public matchmaking rooms first, then creates a bot-fill-ready room when nobody is waiting.
              </p>
            </div>
            <Button href="/matchmaking/quick" icon={<Sparkles className="size-4" />}>
              Find Match
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Room history</p>
              <h2 className="mt-2 text-2xl font-semibold">Your live room trail</h2>
            </div>
            <Button href="/rooms/history" icon={<History className="size-4" />} variant="secondary">
              View History
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Public waiting rooms</p>
              <h2 className="mt-2 text-2xl font-semibold">Open lobbies</h2>
            </div>
            <Badge>Small-room Firestore sync</Badge>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_12rem_12rem_12rem_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-11"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by room, quiz, host, or code"
                value={search}
              />
            </label>
            <Select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
              <option value="all">All categories</option>
              {categoryOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
              <option value="all">All difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </Select>
            <Select onChange={(event) => setSource(event.target.value as RoomSource | "all")} value={source}>
              <option value="all">All sources</option>
              <option value="manual">Manual</option>
              <option value="quick-match">Quick Match</option>
              <option value="challenge">Challenge</option>
              <option value="class-room">Class Room</option>
            </Select>
            <Switch
              checked={availableOnly}
              label="Spots only"
              onCheckedChange={setAvailableOnly}
            />
          </div>

          {roomsLoading ? <LoadingSkeleton variant="card" /> : null}
          {error ? (
            <EmptyState icon={Database} title="Rooms could not load" description={error} />
          ) : null}
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
                        {room.locked ? <Badge>Locked</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {room.roomCode} • {room.quizTitle} • {room.categoryName}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UsersRound className="size-3.5" />
                          {room.playerCount}/{room.maxPlayers} players
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          {formatSeconds(room.settings.questionTimerSeconds)}
                        </span>
                        <span>{titleCase(room.difficulty)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    disabled={room.playerCount >= room.maxPlayers}
                    href={room.playerCount >= room.maxPlayers ? undefined : `/rooms/${room.roomCode}`}
                    size="sm"
                    variant="secondary"
                  >
                    {room.playerCount >= room.maxPlayers ? "Full" : "View Lobby"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {!roomsLoading && !error && !filteredRooms.length ? (
            <div className="mt-5">
              <EmptyState
                icon={UsersRound}
                title={rooms.length ? "No rooms match those filters" : "No public rooms waiting"}
                description={
                  rooms.length
                    ? "Try another category, difficulty, or search term."
                    : "Create a public room to start the first live Quizora session."
                }
                actionHref="/rooms/create"
                actionLabel="Create Room"
              />
            </div>
          ) : null}
        </Card>
      </section>
    </>
  );
}
