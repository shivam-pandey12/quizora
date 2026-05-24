import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { PricingClient } from "@/components/billing/pricing-client";
import { collectionSchema, publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Pricing",
    description:
      "Choose a Quizora plan for premium quiz play, creator tools, classroom workflows, analytics, exports, and live-room upgrades.",
    path: "/pricing"
  })
};

const faqs = [
  {
    question: "Are these recurring subscriptions?",
    answer:
      "Phase 13 uses time-limited Razorpay passes. Full recurring subscription management is planned for a later billing phase."
  },
  {
    question: "Does payment unlock prize tournaments?",
    answer:
      "No. Quizora paid plans unlock SaaS-style features only. There are no cash prizes, payouts, wallets, or gambling-like mechanics."
  },
  {
    question: "When does access activate?",
    answer:
      "Access can activate after server signature verification, then Razorpay webhooks reconcile the final payment status."
  }
];

export default function PricingPage() {
  return (
    <section className="container-page py-12 sm:py-16">
      <JsonLd
        data={collectionSchema({
          title: "Quizora pricing",
          description: "Premium Quizora plans for players, creators, and classroom teams.",
          path: "/pricing"
        })}
      />
      <Badge className="mb-5 text-primary">Quizora plans</Badge>
      <SectionHeader
        eyebrow="Pricing"
        title="Upgrade Quizora only when you need more"
        description="Free play stays useful. Paid passes add premium limits, creator workflows, classroom scale, exports, and richer analytics without turning Quizora into a prize or cash-contest product."
      />
      <Suspense fallback={<Card className="h-96 p-6" />}>
        <PricingClient />
      </Suspense>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {faqs.map((item) => (
          <Card className="p-5" key={item.question}>
            <h2 className="text-lg font-semibold">{item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
