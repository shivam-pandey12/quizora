import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="container-page grid min-h-[78vh] items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden lg:block">
        <p className="text-sm font-semibold uppercase text-primary">Quizora access</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold">
          Your quiz command center is ready.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Sign in to save attempts, track accuracy, join live rooms, and keep
          your progress connected across the arena.
        </p>
        <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
          {["Saved results", "Live rooms", "XP and streaks", "Private profile"].map(
            (item) => (
              <div
                className="rounded-3xl border border-border bg-surface/60 p-4 text-sm font-semibold"
                key={item}
              >
                {item}
              </div>
            )
          )}
        </div>
      </div>
      <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-primary">Account</p>
          <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}
