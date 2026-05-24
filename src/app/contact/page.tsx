import type { Metadata } from "next";
import { LifeBuoy, Mail, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ContactForm } from "@/components/support/contact-form";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Contact",
    description:
      "Contact Quizora support for product questions, content concerns, safety reports, and launch support details.",
    path: "/contact"
  })
};

export default function ContactPage() {
  return (
    <section className="container-page py-12 sm:py-16">
      <Badge className="mb-5 text-primary">
        <LifeBuoy className="mr-2 size-3.5" />
        Support
      </Badge>
      <SectionHeader
        eyebrow="Contact"
        title="Support and launch contact"
        description="A lightweight contact surface for the current build. Wire this to your real support channel before production launch."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Mail className="size-5" />
              </span>
              <h2 className="text-xl font-semibold">Product support</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Use the feedback form for launch notes, content issues, and product questions.
              Admins review submissions in the private feedback queue.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-blue/12 text-blue">
                <ShieldAlert className="size-5" />
              </span>
              <h2 className="text-xl font-semibold">Safety reports</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              Report quiz content issues, room abuse, suspicious leaderboard entries, or account concerns to the admin team while the formal support flow is finalized.
            </p>
          </Card>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
