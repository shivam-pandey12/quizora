"use client";

import {
  AlertTriangle,
  Bot,
  Clipboard,
  Database,
  DoorOpen,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockKeyhole,
  Play,
  RadioTower,
  Share2,
  Unlock,
  UserCheck,
  UserX
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { botFillAvailable, fillRoomWithBots } from "@/lib/firestore/bots";
import {
  cancelRoom,
  joinRoomByCode,
  kickRoomPlayer,
  leaveRoom,
  listenRoomByCode,
  listenRoomPlayers,
  setPlayerReady,
  setRoomLocked,
  setRoomVisibility,
  startRoom,
  updatePlayerHeartbeat
} from "@/lib/firestore/rooms";
import { cn, formatSeconds, titleCase } from "@/lib/utils";
import type { Room, RoomPlayer } from "@/types/domain";

export function RoomLobby({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, loading: authLoading, authReady } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

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
        if (nextRoom?.status === "in-progress") router.replace(`/rooms/${nextRoom.roomCode}/play`);
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

  const currentPlayer = useMemo(
    () => players.find((player) => player.userId === user?.uid) ?? null,
    [players, user?.uid]
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
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isHost = room?.hostId === user?.uid;
  const activePlayers = players.filter(
    (player) => player.status !== "left" && player.status !== "disconnected"
  );
  const realPlayers = activePlayers.filter((player) => !player.isBot);
  const botPlayers = activePlayers.filter((player) => player.isBot);
  const readyCount = activePlayers.filter((player) => player.status === "ready").length;
  const botCountdownSeconds =
    room?.botFillAt ? Math.max(0, Math.ceil((new Date(room.botFillAt).getTime() - nowMs) / 1000)) : 0;
  const canFillBots = Boolean(
    room &&
      isHost &&
      room.status === "waiting" &&
      !room.botFillUsed &&
      botCountdownSeconds <= 0 &&
      botFillAvailable(room, players)
  );
  const canStart =
    Boolean(room) &&
    activePlayers.length >= (room?.minPlayersToStart ?? 1) &&
    (!room?.settings.requireReady || activePlayers.every((player) => player.status === "ready"));

  async function copyInvite() {
    if (!room) return;
    const link = `${window.location.origin}/rooms/${room.roomCode}`;
    const text = `Join my Quizora room ${room.roomCode} for ${room.quizTitle}: ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quizora live room", text, url: link });
      } else {
        await navigator.clipboard.writeText(text);
        showToast({ tone: "success", title: "Invite copied", description: "Room code and link are ready." });
      }
    } catch {
      await navigator.clipboard.writeText(text);
      showToast({ tone: "success", title: "Invite copied", description: "Room code and link are ready." });
    }
  }

  async function joinRoom() {
    if (!user) return;
    setWorking(true);
    try {
      await joinRoomByCode({ roomCode, user, profile });
      showToast({ tone: "success", title: "Joined lobby", description: "You are in the player list." });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not join",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function toggleReady() {
    if (!room || !user || !currentPlayer) return;
    setWorking(true);
    try {
      await setPlayerReady(room.id, user.uid, currentPlayer.status !== "ready");
    } finally {
      setWorking(false);
    }
  }

  async function leaveCurrentRoom() {
    if (!room || !user) return;
    setWorking(true);
    try {
      await leaveRoom(room, user.uid);
      router.push("/rooms");
    } finally {
      setWorking(false);
    }
  }

  async function startCurrentRoom() {
    if (!room || !isHost) return;
    setWorking(true);
    try {
      await startRoom(room, activePlayers);
      router.push(`/rooms/${room.roomCode}/play`);
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Room could not start",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function cancelCurrentRoom() {
    if (!room || !isHost) return;
    setWorking(true);
    try {
      await cancelRoom(room.id);
      setConfirmCancel(false);
    } finally {
      setWorking(false);
    }
  }

  async function kickPlayer(player: RoomPlayer) {
    if (!room || !isHost || working) return;
    setWorking(true);
    try {
      await kickRoomPlayer(room, player.userId);
      showToast({
        tone: "success",
        title: "Player removed",
        description: `${player.displayName} was removed from the waiting lobby.`
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Could not remove player",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function toggleLock() {
    if (!room || !isHost || working) return;
    setWorking(true);
    try {
      await setRoomLocked(room, !room.locked);
      showToast({
        tone: "success",
        title: !room.locked ? "Room locked" : "Room unlocked",
        description: !room.locked ? "New joins are paused." : "Players can join again."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Lock state was not changed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function toggleVisibility() {
    if (!room || !isHost || working) return;
    const nextVisibility = room.visibility === "public" ? "private" : "public";
    setWorking(true);
    try {
      await setRoomVisibility(room, nextVisibility);
      showToast({
        tone: "success",
        title: nextVisibility === "public" ? "Room is public" : "Room is private",
        description:
          nextVisibility === "public"
            ? "It can appear in public discovery while waiting."
            : "It is hidden from public discovery."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Visibility was not changed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setWorking(false);
    }
  }

  async function fillWithBots() {
    if (!room || !isHost || working) return;
    setWorking(true);
    try {
      const added = await fillRoomWithBots(room, players);
      showToast({
        tone: "success",
        title: added ? "Bot players added" : "No bot seats needed",
        description: added
          ? `${added} bot player${added === 1 ? "" : "s"} joined this lobby.`
          : "The room already has enough active players."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Bot fill failed",
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
          title="Sign in to join this room"
          description="Live rooms are login-required so players, scores, and saved results stay tied to real profiles."
          actionHref={`/login?next=${encodeURIComponent(`/rooms/${roomCode}`)}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={AlertTriangle} title="Room could not load" description={error} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={DoorOpen}
          title="Room not found"
          description="Check the code and ask the host for a fresh invite."
          actionHref="/rooms/join"
          actionLabel="Try another code"
        />
      </div>
    );
  }

  if (room.status === "cancelled") {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={AlertTriangle}
          title="Room cancelled"
          description="The host closed this lobby before the quiz started."
          actionHref="/rooms"
          actionLabel="Back to rooms"
        />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-stone-100 to-sky-100 opacity-70 dark:opacity-15" />
      <div className="absolute inset-0 premium-grid opacity-40" />
      <div className="container-page relative grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="text-primary">Lobby</Badge>
                  {room.source === "quick-match" ? <Badge>Quick Match</Badge> : null}
                  {room.source === "challenge" ? <Badge>Challenge</Badge> : null}
                  {room.source === "class-room" ? <Badge>Class Room</Badge> : null}
                  {room.className ? <Badge>{room.className}</Badge> : null}
                  {room.allowBotFill ? <Badge>Bot fill</Badge> : null}
                </div>
                <h1 className="mt-4 text-balance text-4xl font-semibold sm:text-6xl">
                  {room.roomTitle || room.quizTitle}
                </h1>
                <p className="mt-4 text-muted-foreground">
                  {room.roomDescription || `Hosted by ${room.hostName}. Players wait here until the host starts.`}
                </p>
              </div>
              <button
                className="rounded-3xl border border-primary/25 bg-primary/10 px-5 py-4 text-left text-primary"
                onClick={() => void copyInvite()}
                type="button"
              >
                <span className="block text-xs font-semibold uppercase">Room code</span>
                <span className="mt-1 block text-3xl font-semibold tracking-[0.2em]">
                  {room.roomCode}
                </span>
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["Players", `${activePlayers.length}/${room.maxPlayers}`],
                ["Real", `${realPlayers.length}`],
                ["Bots", `${botPlayers.length}`],
                ["Ready", `${readyCount}/${activePlayers.length}`],
                ["Timer", formatSeconds(room.settings.questionTimerSeconds)],
                ["Min start", `${room.minPlayersToStart}`],
                ["Difficulty", titleCase(room.difficulty)]
              ].map(([label, value]) => (
                <div className="rounded-3xl border border-border bg-surface/70 p-4" key={label}>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{room.visibility === "public" ? "Public discovery" : "Private invite"}</Badge>
              <Badge>{room.locked ? "Locked" : "Joinable"}</Badge>
              {room.settings.requireReady ? <Badge>Ready required</Badge> : <Badge>Host can start anytime</Badge>}
              {room.settings.allowLateJoin ? <Badge>Late join allowed</Badge> : null}
              {room.matchmakingEnabled ? <Badge>{room.matchmakingStatus}</Badge> : null}
              {room.allowBotFill && room.botFillAt ? (
                <Badge>{botCountdownSeconds ? `Bot fill in ${botCountdownSeconds}s` : "Bot fill ready"}</Badge>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Players</p>
                <h2 className="mt-2 text-2xl font-semibold">Live roster</h2>
              </div>
              <RadioTower className="size-7 text-primary" />
            </div>
            <div className="mt-5 grid gap-3">
              {activePlayers.map((player) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface/70 p-4"
                  key={player.id}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={player.displayName} size="md" src={player.photoURL} />
                    <div>
                      <p className="font-semibold">{player.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.isBot
                          ? `${titleCase(player.botDifficulty ?? "medium")} bot • ${player.botPersonality}`
                          : player.role === "host"
                            ? "Host"
                            : "Player"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isBot ? (
                      <Badge>
                        <Bot className="mr-1 size-3.5" />
                        Bot
                      </Badge>
                    ) : null}
                    <StatusBadge value={player.status}>{titleCase(player.status)}</StatusBadge>
                    {isHost && room.status === "waiting" && player.role !== "host" ? (
                      <Button
                        disabled={working}
                        icon={<UserX className="size-4" />}
                        onClick={() => void kickPlayer(player)}
                        size="sm"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit p-6 lg:sticky lg:top-24">
          <UserCheck className="size-9 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold">
            {currentPlayer ? "You are in" : "Join this lobby"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Host-controlled advancement keeps room sync predictable and avoids multi-client timer races.
          </p>
          <div className="mt-6 grid gap-3">
            {!currentPlayer ? (
              <Button disabled={working || room.locked} onClick={() => void joinRoom()}>
                {working ? <Loader2 className="size-4 animate-spin" /> : null}
                {room.locked ? "Lobby Locked" : "Join Lobby"}
              </Button>
            ) : (
              <>
                {!isHost ? (
                  <Button disabled={working} onClick={() => void toggleReady()}>
                    {currentPlayer.status === "ready" ? "Mark Not Ready" : "Ready Up"}
                  </Button>
                ) : null}
                {isHost ? (
                  <Button
                    disabled={working || !canStart}
                    icon={<Play className="size-4" />}
                    onClick={() => void startCurrentRoom()}
                  >
                    Start Quiz
                  </Button>
                ) : null}
                {isHost && room.status === "waiting" ? (
                  <>
                    {room.allowBotFill ? (
                      <Button
                        disabled={working || !canFillBots}
                        icon={<Bot className="size-4" />}
                        onClick={() => void fillWithBots()}
                        variant="secondary"
                      >
                        {botCountdownSeconds ? `Bot fill in ${botCountdownSeconds}s` : "Fill with bots"}
                      </Button>
                    ) : null}
                    <Button
                      disabled={working}
                      icon={room.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      onClick={() => void toggleLock()}
                      variant="secondary"
                    >
                      {room.locked ? "Unlock Lobby" : "Lock Lobby"}
                    </Button>
                    <Button
                      disabled={working}
                      icon={room.visibility === "public" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      onClick={() => void toggleVisibility()}
                      variant="secondary"
                    >
                      {room.visibility === "public" ? "Make Private" : "Make Public"}
                    </Button>
                  </>
                ) : null}
                <Button
                  disabled={working}
                  icon={<Share2 className="size-4" />}
                  onClick={() => void copyInvite()}
                  variant="secondary"
                >
                  Share Invite
                </Button>
                <Button
                  disabled={working}
                  icon={<Clipboard className="size-4" />}
                  onClick={() => void copyInvite()}
                  variant="ghost"
                >
                  Copy Code
                </Button>
                <Button
                  className={cn(isHost && "border-danger/30 text-danger")}
                  disabled={working}
                  onClick={isHost ? () => setConfirmCancel(true) : () => void leaveCurrentRoom()}
                  variant={isHost ? "danger" : "ghost"}
                >
                  {isHost ? "Cancel Room" : "Leave Room"}
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
      <ConfirmDialog
        confirmLabel="Cancel room"
        description="This closes the lobby for everyone. Completed attempts are not affected because this room has not started."
        loading={working}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => void cancelCurrentRoom()}
        open={confirmCancel}
        title="Cancel this room?"
      />
    </section>
  );
}
