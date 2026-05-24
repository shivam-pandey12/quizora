import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Privacy Policy",
    description:
      "Review Quizora privacy notes for account data, public quiz surfaces, private attempts, and launch review requirements.",
    path: "/privacy"
  })
};

const sections = [
  {
    title: "Information Quizora uses",
    copy:
      "Quizora uses account identity, quiz attempts, live-room participation, leaderboard entries, progress data, classroom records, and safe billing summaries to provide the app experience."
  },
  {
    title: "Public surfaces",
    copy:
      "Published quiz metadata, active categories, safe leaderboard rows, and public waiting room summaries may be visible to other users."
  },
  {
    title: "Private surfaces",
    copy:
      "Emails, private attempts, answer snapshots, room answer details, matchmaking queues, billing records, classroom submissions, and admin data are intended to stay restricted by auth and Firestore rules."
  },
  {
    title: "Payment summaries",
    copy:
      "Quizora stores safe Razorpay order, payment, entitlement, and refund summaries for support and access control. Full card or bank details should not be stored in Firestore."
  },
  {
    title: "Review before launch",
    copy:
      "This page is a practical product placeholder. Have a qualified legal reviewer adapt it to your jurisdiction, hosting setup, and support process before production launch."
  }
];

export default function PrivacyPage() {
  return (
    <section className="container-page py-12 sm:py-16">
      <Badge className="mb-5 text-primary">
        <ShieldCheck className="mr-2 size-3.5" />
        Launch placeholder
      </Badge>
      <SectionHeader
        eyebrow="Privacy"
        title="Quizora privacy notes"
        description="A concise placeholder for the data boundaries this clean-room build is designed around."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card className="p-6" key={section.title}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{section.copy}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
