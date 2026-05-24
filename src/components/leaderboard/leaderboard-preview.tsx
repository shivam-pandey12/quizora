import { Medal, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SampleLeaderboardEntry } from "@/types/domain";
import { formatNumber } from "@/lib/utils";

export function LeaderboardPreview({ entries }: { entries: SampleLeaderboardEntry[] }) {
  const topThree = entries.slice(0, 3);

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Leaderboard</p>
          <h3 className="mt-1 text-2xl font-semibold">Current arena leaders</h3>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Trophy className="size-6" />
        </span>
      </div>
      <div className="mt-6 grid gap-3">
        {topThree.length ? (
          topThree.map((entry) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/65 p-3"
              key={entry.rank}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Medal className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.category}</p>
                </div>
              </div>
              <Badge>{formatNumber(entry.score)}</Badge>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-border/70 bg-surface/65 p-4">
            <p className="font-semibold">Real rankings appear after verified attempts.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Quizora does not show fake public activity. Seeded quizzes are ready, and the leaderboard fills from trusted results.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
