"use client";

import { Brain, Clock3, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

const orbitCards = [
  { label: "Speed", value: "09:00", icon: Clock3 },
  { label: "Accuracy", value: "96%", icon: Zap },
  { label: "Rank", value: "#12", icon: Crown },
  { label: "Focus", value: "18Q", icon: Brain }
];

export function HeroArena() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5" />
      <div className="absolute inset-[12%] rounded-full border border-blue/15 bg-blue/5" />
      <motion.div
        animate={{ rotate: 360 }}
        className="absolute inset-4"
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      >
        {orbitCards.map((card, index) => {
          const Icon = card.icon;
          const positions = [
            "left-1/2 top-0 -translate-x-1/2",
            "right-0 top-1/2 -translate-y-1/2",
            "bottom-0 left-1/2 -translate-x-1/2",
            "left-0 top-1/2 -translate-y-1/2"
          ];

          return (
            <div className={`absolute ${positions[index]}`} key={card.label}>
              <motion.div
                animate={{ rotate: -360 }}
                className="glass-panel flex min-w-28 items-center gap-3 rounded-3xl p-3"
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
              >
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">{card.label}</span>
                  <span className="block text-sm font-bold">{card.value}</span>
                </span>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
      <Card className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 p-5 shadow-glow">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-white via-amber-50 to-sky-50 p-5 dark:from-white/10 dark:via-primary/10 dark:to-blue/10">
          <p className="text-sm font-semibold uppercase text-primary">Daily challenge</p>
          <h3 className="mt-3 text-3xl font-semibold">Play smarter. Compete sharper.</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Timed quizzes, live rooms, streaks, and rank signals now work together in one polished arena.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className="rounded-2xl bg-surface/80 p-2">18 Q</span>
            <span className="rounded-2xl bg-surface/80 p-2">9 min</span>
            <span className="rounded-2xl bg-surface/80 p-2">XP</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
