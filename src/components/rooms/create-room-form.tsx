"use client";

import { Database, Loader2, LockKeyhole, RadioTower } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { listPublicQuizzes } from "@/lib/firestore/content";
import { createRoom } from "@/lib/firestore/rooms";
import type { Quiz, RoomInput, RoomScoringMode, RoomVisibility } from "@/types/domain";

export function CreateRoomForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, loading, authReady } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RoomInput>({
    roomTitle: "",
    roomDescription: "",
    quizId: "",
    visibility: "private",
    locked: false,
    maxPlayers: 12,
    questionTimerSeconds: 30,
    showCorrectAfterEachQuestion: false,
    allowLateJoin: false,
    requireReady: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    autoAdvance: false,
    autoAdvanceDelaySeconds: 5,
    scoringMode: "standard"
  });

  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured || !user) {
      setQuizzesLoading(false);
      return;
    }

    async function loadQuizzes() {
      try {
        const nextQuizzes = await listPublicQuizzes();
        if (!mounted) return;
        setQuizzes(nextQuizzes);
        setForm((current) => ({
          ...current,
          quizId: current.quizId || nextQuizzes[0]?.id || ""
        }));
      } catch (caught) {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load quizzes.");
        }
      } finally {
        if (mounted) setQuizzesLoading(false);
      }
    }

    void loadQuizzes();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !form.quizId) return;
    setWorking(true);
    setError(null);
    try {
      const roomCode = await createRoom({ user, profile, input: form });
      showToast({
        tone: "success",
        title: "Room created",
        description: `Invite players with code ${roomCode}.`
      });
      router.push(`/rooms/${roomCode}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create room.";
      setError(message);
      showToast({ tone: "error", title: "Room was not created", description: message });
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

  if (loading || quizzesLoading) {
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
          title="Sign in to create a room"
          description="Live rooms require a signed-in host profile."
          actionHref={`/login?next=${encodeURIComponent("/rooms/create")}`}
          actionLabel="Sign in"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Host console"
        title="Create a live quiz room"
        description="Choose a published quiz and set the rhythm for a premium synchronized lobby."
      />
      <section className="container-page pb-16">
        <form className="grid gap-6 lg:grid-cols-[1fr_24rem]" onSubmit={handleCreate}>
          <Card className="p-5">
            <RadioTower className="size-8 text-primary" />
            <h2 className="mt-3 text-2xl font-semibold">Room setup</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Room title</span>
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roomTitle: event.target.value }))
                  }
                  placeholder="Friday mastery sprint"
                  value={form.roomTitle}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Room description</span>
                <Textarea
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roomDescription: event.target.value }))
                  }
                  placeholder="A focused live challenge for friends, classmates, or your study group."
                  value={form.roomDescription}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Quiz</span>
                <Select
                  onChange={(event) => setForm((current) => ({ ...current, quizId: event.target.value }))}
                  value={form.quizId}
                >
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title} ({quiz.questionCount} questions)
                    </option>
                  ))}
                </Select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Visibility</span>
                  <Select
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visibility: event.target.value as RoomVisibility
                      }))
                    }
                    value={form.visibility}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public waiting room</option>
                  </Select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Scoring</span>
                  <Select
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scoringMode: event.target.value as RoomScoringMode
                      }))
                    }
                    value={form.scoringMode}
                  >
                    <option value="standard">Standard</option>
                    <option value="speed-bonus">Speed bonus</option>
                  </Select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Max players</span>
                  <Input
                    min={1}
                    max={50}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxPlayers: Number(event.target.value) }))
                    }
                    type="number"
                    value={form.maxPlayers}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Timer seconds</span>
                  <Input
                    min={10}
                    max={180}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        questionTimerSeconds: Number(event.target.value)
                      }))
                    }
                    type="number"
                    value={form.questionTimerSeconds}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Advance delay</span>
                  <Input
                    min={3}
                    max={20}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        autoAdvanceDelaySeconds: Number(event.target.value)
                      }))
                    }
                    type="number"
                    value={form.autoAdvanceDelaySeconds}
                  />
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-2xl font-semibold">Room behavior</h2>
            <div className="mt-5 grid gap-3">
              <Switch
                checked={form.showCorrectAfterEachQuestion}
                label="Show answers between questions"
                description="Saved for review-mode experiments. Live play stays exam-style by default."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, showCorrectAfterEachQuestion: checked }))
                }
              />
              <Switch
                checked={form.allowLateJoin}
                label="Allow late join"
                description="Late players join from the current question."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, allowLateJoin: checked }))
                }
              />
              <Switch
                checked={form.requireReady}
                label="Require ready before start"
                description="The host can start only when all active players are ready."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, requireReady: checked }))
                }
              />
              <Switch
                checked={form.locked}
                label="Lock lobby after creation"
                description="Only the host can unlock a locked waiting lobby."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, locked: checked }))
                }
              />
              <Switch
                checked={form.shuffleQuestions}
                label="Shuffle questions"
                description="Uses one shared shuffled order for the room."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, shuffleQuestions: checked }))
                }
              />
              <Switch
                checked={form.shuffleOptions}
                label="Shuffle options"
                description="Options are displayed in a stable room order."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, shuffleOptions: checked }))
                }
              />
              <Switch
                checked={form.autoAdvance}
                label="Auto-advance intent"
                description="Host-controlled advancement remains the default to avoid multi-client races."
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, autoAdvance: checked }))
                }
              />
            </div>
            {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
            <div className="mt-6 grid gap-3">
              <Button disabled={working || !form.quizId || !quizzes.length} fullWidth type="submit">
                {working ? <Loader2 className="size-4 animate-spin" /> : null}
                Create live room
              </Button>
              <Button fullWidth href="/rooms" variant="secondary">
                Back to rooms
              </Button>
            </div>
          </Card>
        </form>
      </section>
    </>
  );
}
