import type { Metadata } from "next";
import { CreditCard, FileText, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Refund Policy",
    description:
      "Read Quizora refund and cancellation notes for time-limited digital access passes. This practical policy placeholder needs legal review before live payments.",
    path: "/refund"
  })
};

const notes = [
  {
    icon: CreditCard,
    title: "Digital access passes",
    copy:
      "Quizora paid plans are time-limited digital access passes for premium app features. They do not include prize entries, cash rewards, wallets, or payouts."
  },
  {
    icon: LifeBuoy,
    title: "Support-first handling",
    copy:
      "Refund and cancellation requests should be reviewed by the Quizora support/admin team with the Razorpay payment ID and account email."
  },
  {
    icon: FileText,
    title: "Review before launch",
    copy:
      "This page is a practical placeholder. Have a qualified legal or business reviewer adapt it to your jurisdiction, tax setup, and Razorpay account terms before accepting live payments."
  }
];

export default function RefundPage() {
  return (
    <section className="container-page py-12 sm:py-16">
      <Badge className="mb-5 text-primary">Billing policy</Badge>
      <SectionHeader
        eyebrow="Refunds"
        title="Quizora refund and cancellation notes"
        description="A clear launch placeholder for time-limited access passes. Keep this honest and lawyer-reviewed before live payments."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {notes.map((note) => {
          const Icon = note.icon;
          return (
            <Card className="p-6" key={note.title}>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">{note.title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{note.copy}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
