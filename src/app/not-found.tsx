import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <Card className="max-w-xl p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Compass className="size-7" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold">This arena is not open yet.</h1>
        <p className="mt-4 text-muted-foreground">
          The page may have moved, expired, or never existed. You can return to the quiz library or head home.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/">Return home</Button>
          <Button href="/quizzes" variant="secondary">
            Explore quizzes
          </Button>
        </div>
      </Card>
    </div>
  );
}
