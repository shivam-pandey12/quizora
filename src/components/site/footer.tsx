import { Trophy } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/quizzes", label: "Quizzes" },
  { href: "/rooms", label: "Rooms" },
  { href: "/matchmaking", label: "Matchmaking" },
  { href: "/classes", label: "Classes" },
  { href: "/creator", label: "Creator" },
  { href: "/categories", label: "Categories" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/billing", label: "Billing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refunds" },
  { href: "/contact", label: "Contact" }
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-surface/55">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Trophy className="size-5" />
            </span>
            <p className="text-lg font-bold">Quizora</p>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A premium quiz arena for solo mastery, live rooms, quick matches,
            leaderboards, and thoughtful progress tracking.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 md:justify-end">
          {links.map((link) => (
            <Link
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
