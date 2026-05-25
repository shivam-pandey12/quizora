"use client";

import {
  BookOpen,
  ChevronDown,
  CreditCard,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

interface NavMenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface NavMenuGroup {
  id: string;
  label: string;
  items: NavMenuItem[];
}

const publicNavGroups: NavMenuGroup[] = [
  {
    id: "explore",
    label: "Explore",
    items: [
      {
        href: "/quizzes",
        label: "Quizzes",
        description: "Browse published quiz packs",
        icon: LibraryBig
      },
      {
        href: "/categories",
        label: "Categories",
        description: "Find quizzes by subject lane",
        icon: BookOpen
      },
      {
        href: "/docs",
        label: "Docs",
        description: "Learn how Quizora works",
        icon: Sparkles
      }
    ]
  },
  {
    id: "compete",
    label: "Compete",
    items: [
      {
        href: "/rooms",
        label: "Rooms",
        description: "Create or join live quiz rooms",
        icon: DoorOpen
      },
      {
        href: "/flash",
        label: "Flash",
        description: "Temporary quiz links and host dashboard",
        icon: RadioTower
      },
      {
        href: "/matchmaking",
        label: "Matchmaking",
        description: "Find a quick casual match",
        icon: UsersRound
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        description: "Compare trusted public scores",
        icon: Trophy
      }
    ]
  },
  {
    id: "plans",
    label: "Plans",
    items: [
      {
        href: "/pricing",
        label: "Pricing",
        description: "Compare Free, Plus, Creator, and Classroom",
        icon: CreditCard
      }
    ]
  }
];

function ProfileLogoutPill({
  loggingOut,
  onLogout,
  profileImage,
  profileName,
  onNavigate,
  mobile = false
}: {
  loggingOut: boolean;
  onLogout: () => void;
  profileImage?: string | null;
  profileName: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-12 items-center overflow-hidden rounded-full border border-border bg-surface/80 shadow-soft",
        mobile ? "w-full" : "shrink-0"
      )}
    >
      <Link
        className={cn(
          "flex h-full min-w-0 items-center gap-2 px-3 font-semibold transition hover:bg-primary/10",
          mobile ? "flex-1 justify-center" : "max-w-40"
        )}
        href="/profile"
        onClick={onNavigate}
      >
        <UserAvatar name={profileName} size="sm" src={profileImage} />
        <span className={cn("truncate", mobile ? "text-sm" : "text-sm")}>Profile</span>
      </Link>
      <button
        aria-label="Log out of Quizora"
        className={cn(
          "flex h-full items-center justify-center border-l border-border px-3 text-muted-foreground transition hover:bg-danger/10 hover:text-danger",
          mobile && "gap-2 px-4 text-sm font-semibold"
        )}
        disabled={loggingOut}
        onClick={onLogout}
        type="button"
      >
        <LogOut className="size-4" />
        {mobile ? <span>Logout</span> : null}
      </button>
    </div>
  );
}

function NavDropdown({
  active,
  group,
  onClose,
  onOpen,
  open
}: {
  active: boolean;
  group: NavMenuGroup;
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
          (active || open) && "bg-primary/10 text-primary"
        )}
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        type="button"
      >
        {group.label}
        <ChevronDown
          className={cn("size-4 transition duration-200", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-1/2 top-full z-50 w-[22rem] -translate-x-1/2 pt-3">
          <div className="nav-dropdown-panel rounded-[1.7rem] border border-border bg-surface/95 p-2 shadow-premium backdrop-blur-xl dark:bg-surface/95">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            {group.items.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  className={cn(
                    "nav-dropdown-link flex items-start gap-3 rounded-[1.25rem] p-3 transition hover:bg-primary/10 focus-visible:bg-primary/10",
                    active && "text-foreground"
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={onClose}
                  style={{ animationDelay: `${index * 42}ms` }}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, logout, authReady } = useAuth();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  const profileImage = profile?.photoURL || user?.photoURL;
  const profileName = profile?.displayName || user?.displayName || "Quizora Player";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const workspaceItems: NavMenuItem[] = user
    ? [
        {
          href: "/dashboard",
          label: "Dashboard",
          description: "Review progress and recent attempts",
          icon: LayoutDashboard
        },
        {
          href: "/classes",
          label: "Classes",
          description: "Open student class spaces",
          icon: GraduationCap
        },
        {
          href: "/billing",
          label: "Billing",
          description: "View plan access and payments",
          icon: CreditCard
        },
        ...(adminOverride || profile?.creatorStatus === "approved"
          ? [
              {
                href: "/creator",
                label: "Creator",
                description: "Manage classes and creator drafts",
                icon: Sparkles
              }
            ]
          : []),
        ...(adminOverride
          ? [
              {
                href: "/admin",
                label: "Admin",
                description: "Open Quizora Studio controls",
                icon: ShieldCheck
              }
            ]
          : [])
      ]
    : [];

  const navGroups: NavMenuGroup[] = [
    ...publicNavGroups,
    ...(workspaceItems.length
      ? [
          {
            id: "workspace",
            label: "Workspace",
            items: workspaceItems
          }
        ]
      : [])
  ];

  async function confirmAndLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      setConfirmLogout(false);
    } finally {
      setLoggingOut(false);
    }
  }

  const nav = (
    <>
      {navGroups.map((group) => (
        <div className="space-y-1 lg:hidden" key={group.id}>
          <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
                  isActive(item.href) && "bg-primary/10 text-primary"
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4 py-4">
        <BrandLogo className="shrink-0" variant="header" />
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {navGroups.map((group) => (
            <NavDropdown
              active={group.items.some((item) => isActive(item.href))}
              group={group}
              key={group.id}
              onClose={() => setOpenMenu((current) => (current === group.id ? null : current))}
              onOpen={() => setOpenMenu(group.id)}
              open={openMenu === group.id}
            />
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <ProfileLogoutPill
              loggingOut={loggingOut}
              onLogout={() => setConfirmLogout(true)}
              profileImage={profileImage}
              profileName={profileName}
            />
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Login
              </Button>
              <Button href="/register" disabled={!authReady}>
                Register
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            aria-expanded={open}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-surface/80 transition hover:border-primary/40 hover:bg-primary/10"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="container-page pb-4 lg:hidden">
          <div className="glass-panel grid max-h-[calc(100vh-6rem)] gap-2 overflow-y-auto rounded-3xl p-3">
            {nav}
            <div className="mt-2 grid gap-2 border-t border-border/70 pt-3">
              {user ? (
                <ProfileLogoutPill
                  loggingOut={loggingOut}
                  mobile
                  onLogout={() => setConfirmLogout(true)}
                  onNavigate={() => setOpen(false)}
                  profileImage={profileImage}
                  profileName={profileName}
                />
              ) : (
                <>
                  <Button href="/login" variant="secondary">
                    Login
                  </Button>
                  <Button href="/register" disabled={!authReady}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        confirmLabel="Logout"
        description="You will be signed out of Quizora on this browser. Your saved attempts and progress stay on your profile."
        loading={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => void confirmAndLogout()}
        open={confirmLogout}
        title="Log out of Quizora?"
      />
    </header>
  );
}
