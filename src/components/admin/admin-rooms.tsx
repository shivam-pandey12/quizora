"use client";

import { Bot, DoorOpen, RadioTower, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  expireQueue,
  expireStaleQueues,
  listRecentMatchmakingQueues
} from "@/lib/firestore/matchmaking";
import { cancelRoom, listRecentAdminRooms } from "@/lib/firestore/rooms";
import { formatDate } from "@/lib/firestore/timestamps";
import type { MatchmakingQueueEntry, Room, RoomSource } from "@/types/domain";

function roomFlags(room: Room) {
  const flags: string[] = [...room.antiAbuse.flags];
  if (room.playerCount >= room.maxPlayers) flags.push("Full room");
  if (room.status === "in-progress" && room.startedAt) {
    const age = Date.now() - new Date(room.startedAt).getTime();
    if (age > 90 * 60 * 1000) flags.push("Long active session");
  }
  if (room.settings.scoringMode === "speed-bonus") flags.push("Speed scoring");
  return flags;
}

export function AdminRooms() {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [source, setSource] = useState<RoomSource | "all">("all");
  const [botOnly, setBotOnly] = useState("all");
  const [queues, setQueues] = useState<MatchmakingQueueEntry[]>([]);
  const [working, setWorking] = useState(false);
  const [roomToCancel, setRoomToCancel] = useState<Room | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRooms() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }

      try {
        const [nextRooms, nextQueues] = await Promise.all([
          listRecentAdminRooms(80),
          listRecentMatchmakingQueues(40)
        ]);
        if (mounted) {
          setRooms(nextRooms);
          setQueues(nextQueues);
        }
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load rooms.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRooms();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesStatus = status === "all" || room.status === status;
      const matchesVisibility = visibility === "all" || room.visibility === visibility;
      const matchesSource = source === "all" || room.source === source;
      const matchesBot = botOnly === "all" || (botOnly === "bot" ? room.botFillUsed : !room.botFillUsed);
      const matchesQuery =
        !normalized ||
        [room.roomCode, room.quizTitle, room.hostName, room.categoryName].some((value) =>
          value.toLowerCase().includes(normalized)
        );
      return matchesStatus && matchesVisibility && matchesSource && matchesBot && matchesQuery;
    });
  }, [botOnly, query, rooms, source, status, visibility]);

  const activeRooms = rooms.filter((room) => room.status === "in-progress").length;
  const waitingRooms = rooms.filter((room) => room.status === "waiting").length;
  const completedRooms = rooms.filter((room) => room.status === "completed").length;
  const publicWaitingRooms = rooms.filter(
    (room) => room.status === "waiting" && room.visibility === "public"
  ).length;
  const flaggedRooms = rooms.filter((room) => roomFlags(room).length).length;
  const quickRooms = rooms.filter((room) => room.source === "quick-match").length;
  const activeQueues = queues.filter((queue) => queue.status === "searching").length;
  const botFilledRooms = rooms.filter((room) => room.botFillUsed).length;

  async function confirmCancelRoom() {
    if (!roomToCancel) return;
    setWorking(true);
    try {
      await cancelRoom(roomToCancel.id);
      setRooms((current) =>
        current.map((room) =>
          room.id === roomToCancel.id ? { ...room, status: "cancelled" } : room
        )
      );
      showToast({
        tone: "success",
        title: "Room cancelled",
        description: `${roomToCancel.roomCode} is now closed.`
      });
      setRoomToCancel(null);
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

  async function expireQueueEntry(queue: MatchmakingQueueEntry) {
    setWorking(true);
    try {
      await expireQueue(queue.userId);
      setQueues((current) =>
        current.map((item) => (item.id === queue.id ? { ...item, status: "expired" } : item))
      );
      showToast({ tone: "success", title: "Queue expired", description: queue.displayName });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Queue was not expired",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function expireStaleQueueEntries() {
    setWorking(true);
    try {
      const expired = await expireStaleQueues(25);
      const nextQueues = await listRecentMatchmakingQueues(40);
      setQueues(nextQueues);
      showToast({
        tone: "success",
        title: "Stale queue cleanup complete",
        description: `${expired} queue entr${expired === 1 ? "y" : "ies"} expired.`
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Cleanup failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Live rooms</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Room operations monitor</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Inspect recent live rooms, debug host/player state, and cancel active or waiting rooms when needed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<DoorOpen className="size-5" />} label="Recent rooms" value={String(rooms.length)} helper="Loaded admin window" />
        <StatCard label="Waiting" value={String(waitingRooms)} helper="Open lobbies" />
        <StatCard label="In progress" value={String(activeRooms)} helper="Currently active" />
        <StatCard icon={<ShieldAlert className="size-5" />} label="Flags" value={String(flaggedRooms)} helper="Debug placeholders" />
        <StatCard label="Completed" value={String(completedRooms)} helper="Finished rooms" />
        <StatCard label="Public waiting" value={String(publicWaitingRooms)} helper="Discovery-visible" />
        <StatCard icon={<RadioTower className="size-5" />} label="Quick rooms" value={String(quickRooms)} helper="Matchmaking source" />
        <StatCard icon={<Bot className="size-5" />} label="Bot-filled" value={String(botFilledRooms)} helper="Casual bot lobbies" />
        <StatCard label="Active queues" value={String(activeQueues)} helper="Searching users" />
      </div>

      <Card className="p-4">
        <SectionHeader
          className="mb-4"
          title="Filters"
          description="Search by room code, host, quiz, or category."
        />
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_12rem_12rem]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-11"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rooms"
              value={query}
            />
          </label>
          <Select onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select onChange={(event) => setVisibility(event.target.value)} value={visibility}>
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Select>
          <Select onChange={(event) => setSource(event.target.value as RoomSource | "all")} value={source}>
            <option value="all">All sources</option>
            <option value="manual">Manual</option>
            <option value="quick-match">Quick Match</option>
            <option value="challenge">Challenge</option>
            <option value="class-room">Class Room</option>
          </Select>
          <Select onChange={(event) => setBotOnly(event.target.value)} value={botOnly}>
            <option value="all">Bot fill any</option>
            <option value="bot">Bot-filled only</option>
            <option value="real">No bot fill</option>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title="Matchmaking queues"
            description="Admin-only view of recent Quick Match queue documents and stale-search cleanup."
          />
          <Button disabled={working} onClick={() => void expireStaleQueueEntries()} variant="secondary">
            Expire stale queues
          </Button>
        </div>
        {queues.length ? (
          <div className="mt-4 grid gap-3">
            {queues.slice(0, 8).map((queue) => (
              <div
                className="grid gap-3 rounded-3xl border border-border bg-surface/70 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                key={queue.id}
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-primary">{queue.status}</Badge>
                    <Badge>{queue.allowBotFill ? "Bot fill" : "No bots"}</Badge>
                    <Badge>{queue.preferredPlayerCount} players</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{queue.displayName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDate(queue.createdAt)} • Expires {formatDate(queue.expiresAt)} • Room{" "}
                    {queue.matchedRoomCode || "--"}
                  </p>
                </div>
                <Button
                  disabled={working || queue.status !== "searching"}
                  onClick={() => void expireQueueEntry(queue)}
                  size="sm"
                  variant="secondary"
                >
                  Expire
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No matchmaking queues in the current admin window.</p>
        )}
      </Card>

      <AdminDataState
        empty={!filtered.length}
        emptyDescription="Live rooms will appear here once hosts create them."
        emptyTitle="No rooms found"
        error={error}
        loading={loading}
      />

      {!loading && !error && filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((room) => {
            const flags = roomFlags(room);
            const canCancel = room.status === "waiting" || room.status === "in-progress";
            return (
              <Card className="p-4" key={room.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="text-primary">{room.roomCode}</Badge>
                      <StatusBadge value={room.status}>{room.status}</StatusBadge>
                      <Badge>{room.source === "quick-match" ? "Quick Match" : room.source === "challenge" ? "Challenge" : room.source === "class-room" ? "Class Room" : "Manual"}</Badge>
                      {room.botFillUsed ? <Badge>Bot-filled</Badge> : null}
                      {flags.map((flag) => (
                        <Badge className="border-warning/20 bg-warning/10 text-warning" key={flag}>
                          {flag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{room.quizTitle}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Host {room.hostName} • {room.playerCount}/{room.maxPlayers} players •{" "}
                      {room.categoryName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {formatDate(room.createdAt)} • Started {formatDate(room.startedAt)} • Completed{" "}
                      {formatDate(room.completedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button href={`/rooms/${room.roomCode}`} size="sm" variant="secondary">
                      View
                    </Button>
                    <Button href={`/admin/rooms/${room.id}`} size="sm" variant="secondary">
                      Detail
                    </Button>
                    {room.status === "completed" ? (
                      <Button href={`/rooms/${room.roomCode}/result`} size="sm" variant="secondary">
                        Results
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button
                        onClick={() => setRoomToCancel(room)}
                        size="sm"
                        variant="danger"
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Cancel room"
        description={`This closes ${roomToCancel?.roomCode ?? "the room"} for all players. Attempts already saved are not deleted.`}
        loading={working}
        onCancel={() => setRoomToCancel(null)}
        onConfirm={() => void confirmCancelRoom()}
        open={Boolean(roomToCancel)}
        title="Cancel live room?"
      />
    </div>
  );
}
