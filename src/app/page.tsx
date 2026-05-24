import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Crown,
  DoorOpen,
  Gauge,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Trophy
} from "lucide-react";
import { HeroArena } from "@/components/home/hero-arena";
import { HomeFeaturedContent } from "@/components/home/home-featured-content";
import { LeaderboardPreview } from "@/components/leaderboard/leaderboard-preview";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { leaderboardEntries, sampleQuizzes } from "@/data/sample-data";
import { appSchema, collectionSchema, publicMetadata, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Quizora — Play, Compete, and Master Quizzes",
    description:
      "Play premium quizzes, join live quiz rooms, compete on leaderboards, and track your progress on Quizora.",
    path: "/"
  })
};

const featureItems = [
  {
    icon: Gauge,
    title: "Built for focused play",
    copy: "Timed quiz rounds, saved answer reviews, and clear progress cues keep learning sharp."
  },
  {
    icon: Trophy,
    title: "Competition ready",
    copy: "Leaderboard entries, podiums, streaks, and badges reward strong attempts without clutter."
  },
  {
    icon: ShieldCheck,
    title: "Admin-aware controls",
    copy: "Quiz, category, question, room, and attempt tools stay separated behind admin access."
  }
];

export default function HomePage() {
  const featuredQuizzes = sampleQuizzes.filter((quiz) => quiz.isFeatured).slice(0, 3);

  return (
    <>
      <JsonLd data={websiteSchema()} />
      <JsonLd data={appSchema()} />
      <JsonLd
        data={collectionSchema({
          title: "Featured Quizora quizzes",
          description: "Featured public quiz experiences available on Quizora.",
          path: "/",
          items: featuredQuizzes.map((quiz) => ({
            name: quiz.title,
            path: `/quizzes/${quiz.slug}`
          }))
        })}
      />
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="absolute inset-0 premium-grid opacity-70" />
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <Badge className="mb-5 text-primary">
              <Sparkles className="mr-2 size-3.5" />
              Premium quiz arena
            </Badge>
            <h1 className="text-balance text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
              Play smarter. Compete sharper.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Quizora brings published quizzes, saved reviews, live rooms,
              quick matchmaking, and progress tracking into one refined learning arena.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/quizzes" icon={<ArrowRight className="size-4" />} size="lg">
                Start Exploring Quizzes
              </Button>
              <Button
                href="/matchmaking/quick"
                icon={<RadioTower className="size-4" />}
                size="lg"
                variant="secondary"
              >
                Find Quick Match
              </Button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {["Solo play", "Live rooms", "Leaderboards"].map((item) => (
                <div
                  className="rounded-3xl border border-border bg-surface/60 p-4 text-sm font-semibold"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <HeroArena />
        </div>
      </section>

      <HomeFeaturedContent />

      <section className="container-page grid gap-6 py-12 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <SectionHeader
            eyebrow="Why Quizora?"
            title="A calm, premium base for serious quiz growth"
            description="The product is built around fast discovery, saved learning history, and casual competition that still feels polished."
          />
          <div className="grid gap-4">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card className="p-5" key={item.title}>
                  <div className="flex gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-6" />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        <div className="grid gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Daily teaser</p>
                <h3 className="mt-2 text-3xl font-semibold">The 9-minute mastery run</h3>
              </div>
              <Crown className="size-10 text-primary" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Daily challenge styling is ready for curation, while attempts,
              XP, streaks, and reviews already feed your progress profile.
            </p>
          </Card>
          <LeaderboardPreview entries={leaderboardEntries} />
        </div>
      </section>

      <section className="container-page py-12">
        <Card className="grid gap-8 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Creator quality signal
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              Admin workflows have a premium control surface.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Quiz managers, category managers, question tools, attempts, rooms,
              and settings stay organized without leaking admin actions to players.
            </p>
          </div>
          <div className="grid gap-3">
            {["Quiz publishing", "Live room monitor", "Attempt review"].map(
              (item) => (
                <div
                  className="flex items-center gap-3 rounded-3xl border border-border bg-surface/70 p-4 font-semibold"
                  key={item}
                >
                  <CheckCircle2 className="size-5 text-success" />
                  {item}
                </div>
              )
            )}
          </div>
        </Card>
      </section>

      <section className="container-page pb-16 pt-8">
        <Card className="overflow-hidden p-8 text-center sm:p-10">
          <BarChart3 className="mx-auto size-10 text-primary" />
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold">
            Start a quiz, join a room, or find a match.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
            Choose the flow that fits the moment: focused solo play, live-room
            competition with friends, or a quick casual match.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/quizzes">Browse quizzes</Button>
            <Button href="/rooms" icon={<DoorOpen className="size-4" />} variant="secondary">
              Open live rooms
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
