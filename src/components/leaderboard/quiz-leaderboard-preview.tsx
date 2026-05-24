"use client";

import { AlertTriangle, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  getQuizLeaderboardPreview,
  getUserQuizBest
} from "@/lib/firestore/leaderboards";
import { formatNumber, formatSeconds } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/domain";

export function QuizLeaderboardPreview({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [best, setBest] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    async function loadPreview() {
      try {
        const [leaderboard, userBest] = await Promise.all([
          getQuizLeaderboardPreview(quizId),
          user ? getUserQuizBest(quizId, user.uid) : Promise.resolve(null)
        ]);
        if (!mounted) return;
        setEntries(leaderboard.entries);
        setBest(userBest);
      } catch (caught) {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load top scores.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPreview();

    return () => {
      mounted = false;
    };
  }, [quizId, user]);

  return (
    <Card className="p-6">
      <SectionHeader
        className="mb-5"
        eyebrow="Leaderboard"
        title="Top scores"
        description="Best all-time attempts for this quiz."
      />
      {loading ? <LoadingSkeleton /> : null}
      {error ? (
        <EmptyState icon={AlertTriangle} title="Top scores unavailable" description={error} />
      ) : null}
      {!loading && !error && entries.length ? (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <div
              className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface/70 p-4"
              key={entry.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-lg font-semibold text-primary">#{entry.rank}</span>
                <UserAvatar name={entry.userDisplayName} size="md" src={entry.userPhotoURL} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.userDisplayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.accuracy}% • {formatSeconds(entry.timeTakenSeconds)}
                  </p>
                </div>
              </div>
              <p className="font-semibold">{formatNumber(entry.score)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!loading && !error && !entries.length ? (
        <EmptyState
          icon={Trophy}
          title="No ranked attempts yet"
          description="Be the first player to post a score on this quiz."
        />
      ) : null}
      {best ? (
        <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/10 p-4 text-primary">
          <p className="text-sm font-semibold uppercase">Your best</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatNumber(best.score)} points • {best.accuracy}% accuracy
          </p>
        </div>
      ) : null}
      <Button className="mt-5" href={`/leaderboard?scope=quiz&quizId=${quizId}`} variant="secondary">
        View full leaderboard
      </Button>
    </Card>
  );
}
