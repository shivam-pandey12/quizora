import Link from "next/link";
import { BrandLogo } from "@/components/site/brand-logo";

const linkGroups = [
  {
    title: "Play",
    links: [
      { href: "/quizzes", label: "Quizzes" },
      { href: "/categories", label: "Categories" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/rooms", label: "Rooms" },
      { href: "/flash", label: "Flash" },
      { href: "/matchmaking", label: "Matchmaking" }
    ]
  },
  {
    title: "Create",
    links: [
      { href: "/creator", label: "Creator" },
      { href: "/classes", label: "Classes" },
      { href: "/docs", label: "Docs" }
    ]
  },
  {
    title: "Account",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/pricing", label: "Pricing" },
      { href: "/billing", label: "Billing" }
    ]
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refund", label: "Refunds" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-surface/55">
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.25fr)] lg:items-start">
        <div className="max-w-xl">
          <BrandLogo className="inline-flex" />
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A premium quiz arena for solo mastery, live rooms, quick matches,
            leaderboards, and thoughtful progress tracking.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4"
        >
          {linkGroups.map((group) => (
            <div className="min-w-0" key={group.title}>
              <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
              <div className="mt-3 grid gap-2">
                {group.links.map((link) => (
                  <Link
                    className="text-sm font-semibold text-muted-foreground transition hover:text-primary"
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
