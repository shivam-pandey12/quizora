"use client";

import {
  BarChart3,
  Banknote,
  ClipboardList,
  CreditCard,
  Crown,
  DoorOpen,
  FileQuestion,
  Gauge,
  GraduationCap,
  Import,
  ShieldCheck,
  Layers3,
  ListChecks,
  MessageSquare,
  MessageSquareWarning,
  NotebookTabs,
  RadioTower,
  RotateCcw,
  Sparkles,
  Settings,
  Star,
  Trophy,
  UserCog,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGate } from "@/components/auth/admin-gate";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/quizzes", label: "Quizzes", icon: FileQuestion },
  { href: "/admin/questions", label: "Questions", icon: ClipboardList },
  { href: "/admin/categories", label: "Categories", icon: Layers3 },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/classes", label: "Classes", icon: GraduationCap },
  { href: "/admin/creators", label: "Creators", icon: UserCog },
  { href: "/admin/creator-requests", label: "Creator requests", icon: UserCog },
  { href: "/admin/creator-quizzes", label: "Creator review", icon: FileQuestion },
  { href: "/admin/attempts", label: "Attempts", icon: ListChecks },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
  { href: "/admin/reports", label: "Reports", icon: MessageSquareWarning },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/admin/billing", label: "Billing", icon: Banknote },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/entitlements", label: "Entitlements", icon: Crown },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/admin/flash", label: "Flash", icon: RadioTower },
  { href: "/admin/daily-challenge", label: "Daily", icon: Sparkles },
  { href: "/admin/featured", label: "Featured", icon: Star },
  { href: "/admin/import-export", label: "Import/export", icon: Import },
  { href: "/admin/audit-log", label: "Audit log", icon: NotebookTabs },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container-page py-8 sm:py-10">
      <AdminGate>
        <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
          <aside className="glass-panel h-fit rounded-3xl p-3 lg:sticky lg:top-24">
            <p className="px-3 py-2 text-sm font-semibold uppercase text-primary">
              Admin Studio
            </p>
            <nav className="mt-2 grid gap-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const active =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
                      active && "bg-primary/12 text-primary"
                    )}
                    href={link.href}
                    key={link.href}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </AdminGate>
    </div>
  );
}
