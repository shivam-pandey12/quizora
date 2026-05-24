"use client";

import { Clock, Lock, Play, Sparkles, Star, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { QuizCardItem } from "@/types/domain";
import { formatNumber, titleCase } from "@/lib/utils";

export function QuizCard({ quiz, featured = false }: { quiz: QuizCardItem; featured?: boolean }) {
  const accent = quiz.accent ?? "from-amber-200 via-stone-100 to-sky-100";
  const highlighted = featured || quiz.isFeatured;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Card className="group relative h-full overflow-hidden p-5 hover:-translate-y-1 hover:shadow-glow">
        <div
          className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${accent} opacity-80 dark:opacity-20`}
        />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <Badge className="bg-white/80 text-primary dark:bg-white/10">
              {quiz.categoryName}
            </Badge>
            {highlighted ? (
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                <Sparkles className="size-4" />
              </span>
            ) : null}
          </div>
          <h3 className="mt-8 text-2xl font-semibold">{quiz.title}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {quiz.shortDescription || quiz.description}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
            <span className="rounded-2xl bg-surface/70 px-3 py-2">
              {titleCase(quiz.difficulty)}
            </span>
            <span className="rounded-2xl bg-surface/70 px-3 py-2">
              {quiz.questionCount} questions
            </span>
            <span className="flex items-center gap-1 rounded-2xl bg-surface/70 px-3 py-2">
              <Timer className="size-3.5" />
              {quiz.estimatedMinutes} min
            </span>
            <span className="flex items-center gap-1 rounded-2xl bg-surface/70 px-3 py-2">
              <Star className="size-3.5 fill-primary text-primary" />
              {quiz.totalPoints ?? 0} pts
            </span>
          </div>
          {quiz.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {quiz.tags.slice(0, 3).map((tag) => (
                <Badge className="px-2 py-0.5 text-[0.7rem]" key={tag}>
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border/70 pt-5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {formatNumber(quiz.playCount)} plays
            </span>
            <div className="flex gap-2">
              {quiz.id && quiz.questionCount > 0 ? (
                <Button href={`/play/${quiz.id}`} icon={<Play className="size-4" />} size="sm" variant="secondary">
                  Start
                </Button>
              ) : (
                <Button disabled icon={<Lock className="size-4" />} size="sm" variant="secondary">
                  Setup
                </Button>
              )}
              <Button href={`/quizzes/${quiz.slug}`} icon={<Play className="size-4" />} size="sm">
                Details
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.article>
  );
}
