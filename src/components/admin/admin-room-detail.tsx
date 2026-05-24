"use client";

import { AlertTriangle, Bot, Clipboard, DoorOpen, RadioTower, ShieldAlert, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  cancelRoom,
  getRoom,
  listRoomAnswers,
  listRoomPlayersOnce,
  listRoomResultsOnce
} from "@/lib/firestore/rooms";
import type { Room, RoomAnswer, RoomPlayer, RoomResult } from "@/types/domain";

function adminFlags(room: Room | null, answers: RoomAnswer[]) {
  if (!room) return [];
  const flags = new Set(room.antiAbuse.flags);
  const lateAnswers = answers.filter((answer) => {
    if (!room.questionEndsAt || !answer.answeredAt) return false;
    return new Date(answer.answeredAt).getTime() > new Date(room.questionEndsAt).getTime();
  });
  if (lateAnswers.length) flags.add("Answers after question deadline");
  if (room.analytics.durationSeconds && room.analytics.durationSeconds < room.totalQuestions * 5) {
    flags.add("Very fast completion");
  }
  return Array.from(flags);
}

export function AdminRoomDetail({ roomId }: { roomId: string }) {
  const { showToast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [answers, setAnswers] = useState<RoomAnswer[]>([]);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadRoom() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const nextRoom = await getRoom(roomId);
        if (!nextRoom) {
          if (mounted) setRoom(null);
          return;
        }
        const [nextPlayers, nextAnswers, nextResults] = await Promise.all([
          listRoomPlayersOnce(nextRoom.id),
          listRoomAnswers(nextRoom.id),
          listRoomResultsOnce(nextRoom.id)
        ]);
        if (!mounted) return;
        setRoom(nextRoom);
        setPlayers(nextPlayers);
        setAnswers(nextAnswers);
        setResults(nextResults);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load room detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRoom();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  const flags = useMemo(() => adminFlags(room, answers), [answers, room]);
  const canCancel = room?.status === "waiting" || room?.status === "in-progress";

  async function copyCode() {
    if (!room) return;
    await navigator.clipboard.writeText(room.roomCode);
    showToast({ tone: "success", title: "Room code copied", description: room.roomCode });
  }

  async function confirmCancelRoom() {
    if (!room) return;
    setWorking(true);
    try {
      await cancelRoom(room.id);
      setRoom({ ...room, status: "cancelled" });
      setConfirmCancel(false);
      showToast({ tone: "success", title: "Room cancelled", description: `${room.roomCode} is closed.` });
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

  if (loading || error || !room) {
    return (
      <AdminDataState
        empty={!room && !loading && !error}
        emptyDescription="The room may have been removed or the ID is invalid."
        emptyTitle="Room not found"
        error={error}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Room detail</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold">{room.roomTitle || room.quizTitle}</h1>
          <p className="mt-3 text-muted-foreground">
            {room.roomCode} • Host {room.hostName} • {room.visibility} • {room.status}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{room.source === "quick-match" ? "Quick Match" : room.source === "challenge" ? "Challenge" : room.source === "class-room" ? "Class Room" : "Manual"}</Badge>
            {room.matchmakingEnabled ? <Badge>{room.matchmakingStatus}</Badge> : null}
            {room.botFillUsed ? <Badge>Bot-filled</Badge> : null}
            {room.challengeId ? <Badge>Challenge {room.challengeId.slice(0, 6)}</Badge> : null}
            {room.className ? <Badge>{room.className}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Clipboard className="size-4" />} onClick={() => void copyCode()} variant="secondary">
            Copy Code
          </Button>
          <Button href={`/rooms/${room.roomCode}`} variant="secondary">
            Public View
          </Button>
          {canCancel ? (
            <Button onClick={() => setConfirmCancel(true)} variant="danger">
              Cancel Room
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<UsersRound className="size-5" />} label="Players" value={`${players.length}`} helper={`${room.playerCount}/${room.maxPlayers} active count`} />
        <StatCard icon={<Trophy className="size-5" />} label="Results" value={`${results.length}`} helper="Completed podium rows" />
        <StatCard label="Avg score" value={`${room.analytics.averageScore}`} helper={`${room.analytics.averageAccuracy}% average accuracy`} />
        <StatCard icon={<ShieldAlert className="size-5" />} label="Flags" value={`${flags.length}`} helper="Admin-only review labels" />
        <StatCard icon={<RadioTower className="size-5" />} label="Source" value={room.source === "quick-match" ? "Quick" : room.source === "class-room" ? "Class" : room.source} helper={`Min ${room.minPlayersToStart}, preferred ${room.preferredPlayerCount}`} />
      </div>

      {flags.length ? (
        <Card className="border-warning/30 bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 text-warning" />
            <div>
              <h2 className="text-xl font-semibold">Review suggested</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {flags.map((flag) => (
                  <Badge className="border-warning/20 bg-warning/10 text-warning" key={flag}>
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Players</h2>
          <div className="mt-5 grid gap-3">
            {players.map((player) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface/70 p-4" key={player.id}>
                <div className="flex items-center gap-3">
                  <UserAvatar name={player.displayName} size="md" src={player.photoURL} />
                  <div>
                    <p className="font-semibold">{player.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {player.isBot ? `${player.botDifficulty} bot` : player.role} • {player.score} pts • {player.correctCount} correct
                    </p>
                  </div>
                </div>
                {player.isBot ? (
                  <Badge>
                    <Bot className="mr-1 size-3.5" />
                    Bot
                  </Badge>
                ) : null}
                <StatusBadge value={player.status}>{player.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-2xl font-semibold">Room analytics</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Total joined", room.analytics.totalJoined],
              ["Peak players", room.analytics.peakPlayers],
              ["Completed players", room.analytics.completedPlayerCount],
              ["Abandoned", room.analytics.abandonCount],
              ["Duration", `${room.analytics.durationSeconds}s`],
              ["Avg/question", `${room.analytics.averageTimePerQuestion}s`]
            ].map(([label, value]) => (
              <div className="flex justify-between rounded-2xl border border-border bg-surface/70 p-3" key={label}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-2xl font-semibold">Final results</h2>
        {results.length ? (
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <div className="grid gap-3 rounded-3xl border border-border bg-surface/70 p-4 md:grid-cols-[4rem_1fr_auto] md:items-center" key={result.id}>
                <p className="text-2xl font-semibold text-primary">#{result.rank}</p>
                <div>
                  <p className="font-semibold">{result.displayName}</p>
                  {result.isBot ? <Badge className="mt-1">Bot result</Badge> : null}
                  <p className="text-sm text-muted-foreground">
                    {result.correctCount} correct • {result.wrongCount} wrong • {result.skippedCount} skipped
                  </p>
                </div>
                <Badge>{result.score}/{result.totalPoints} pts</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={DoorOpen}
            title="No results yet"
            description="Results appear after the host finishes the room."
          />
        )}
      </Card>

      <ConfirmDialog
        confirmLabel="Cancel room"
        description={`This closes ${room.roomCode} for all players. Saved results are not deleted.`}
        loading={working}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => void confirmCancelRoom()}
        open={confirmCancel}
        title="Cancel live room?"
      />
    </div>
  );
}
