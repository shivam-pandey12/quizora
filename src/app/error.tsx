"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <Card className="max-w-xl p-8 text-center">
        <p className="text-sm font-semibold uppercase text-primary">
          Something needs attention
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Quizora hit a rough edge.</h1>
        <p className="mt-4 text-muted-foreground">
          This view caught an unexpected state. Try again, or return to a stable page if the issue repeats.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
