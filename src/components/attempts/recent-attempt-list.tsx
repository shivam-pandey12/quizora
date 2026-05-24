"use client";

import { AlertTriangle, Clock3, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatSeconds, titleCase } from "@/lib/utils";
import type { Attempt } from "@/types/domain";

function formatDate(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function RecentAttemptList({
  attempts,
  loading,
  error,
  emptyTitle = "No attempts yet",
  emptyDescription = "Complete a quiz to see score, accuracy, XP, and review links here.",
  showUser = false
}: {
  attempts: Attempt[];
  loading: boolean;
  error: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  showUser?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3">
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState icon={AlertTriangle} title="Attempts could not load" description={error} />
    );
  }

  if (!attempts.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-3">
      {attempts.map((attempt) => (
        <Card className="p-4 hover:-translate-y-0.5 hover:shadow-glow" key={attempt.id}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge value={attempt.difficulty}>
                  {titleCase(attempt.difficulty)}
                </StatusBadge>
                <Badge>{attempt.categoryName}</Badge>
                {showUser ? <Badge>{attempt.userDisplayName}</Badge> : null}
              </div>
              <h3 className="truncate text-lg font-semibold">{attempt.quizTitle}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="size-4 text-primary" />
                  {attempt.score}/{attempt.totalPoints} pts
                </span>
                <span>{attempt.accuracy}% accuracy</span>
                <span className="flex items-center gap-1">
                  <Clock3 className="size-4" />
                  {formatSeconds(attempt.timeTakenSeconds)}
                </span>
                <span>{formatDate(attempt.completedAt)}</span>
              </div>
            </div>
            <Button href={`/result/${attempt.id}`} size="sm" variant="secondary">
              Review
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
