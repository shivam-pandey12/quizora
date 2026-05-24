import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Terms",
    description:
      "Read Quizora use terms for quiz play, live rooms, leaderboards, paid access passes, and launch review notes.",
    path: "/terms"
  })
};

const terms = [
  "Quizora is a quiz, leaderboard, live-room, matchmaking, classroom, and creator product. Paid plans are time-limited digital access passes for premium app features.",
  "Paid access does not create prize entries, cash winnings, wallets, payouts, or gambling-like contests.",
  "Users are expected to play fairly, avoid abusing rooms or queues, and respect admin moderation decisions.",
  "Client-side scoring and Firestore-hosted live rooms are suitable for casual play. Serious competitive or prize use needs future server-authoritative scoring.",
  "Refund and cancellation handling is tracked through support and the refund policy placeholder until legal review is complete.",
  "These terms are a practical placeholder and should be reviewed by a qualified legal professional before production launch and live payments."
];

export default function TermsPage() {
  return (
    <section className="container-page py-12 sm:py-16">
      <Badge className="mb-5 text-primary">
        <FileText className="mr-2 size-3.5" />
        Launch placeholder
      </Badge>
      <SectionHeader
        eyebrow="Terms"
        title="Quizora use terms"
        description="Short product terms for the current casual-competition and paid digital-access scope."
      />
      <Card className="p-6 sm:p-8">
        <div className="grid gap-4">
          {terms.map((term) => (
            <p className="rounded-3xl border border-border bg-surface/60 p-4 leading-7 text-muted-foreground" key={term}>
              {term}
            </p>
          ))}
        </div>
      </Card>
    </section>
  );
}
