"use client";

import { LogOut, Menu, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const publicLinks = [
  { href: "/quizzes", label: "Quizzes" },
  { href: "/rooms", label: "Rooms" },
  { href: "/matchmaking", label: "Matchmaking" },
  { href: "/categories", label: "Categories" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/pricing", label: "Pricing" }
];

function Logo() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
        <Trophy className="size-5" />
      </span>
      <span className="text-lg font-bold tracking-normal">Quizora</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, logout, authReady } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const adminOverride = hasAdminAccess({ email: user?.email, profile });
  const profileImage = profile?.photoURL || user?.photoURL;
  const profileName = profile?.displayName || user?.displayName || "Quizora Player";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
      {publicLinks.map((link) => (
        <Link
          className={cn(
            "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
            isActive(link.href) && "bg-primary/10 text-primary"
          )}
          href={link.href}
          key={link.href}
          onClick={() => setOpen(false)}
        >
          {link.label}
        </Link>
      ))}
      {user ? (
        <>
          <Link
            className={cn(
              "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
              isActive("/dashboard") && "bg-primary/10 text-primary"
            )}
            href="/dashboard"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            className={cn(
              "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
              isActive("/classes") && "bg-primary/10 text-primary"
            )}
            href="/classes"
            onClick={() => setOpen(false)}
          >
            Classes
          </Link>
          <Link
            className={cn(
              "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
              isActive("/billing") && "bg-primary/10 text-primary"
            )}
            href="/billing"
            onClick={() => setOpen(false)}
          >
            Billing
          </Link>
          {adminOverride || profile?.creatorStatus === "approved" ? (
            <Link
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
                isActive("/creator") && "bg-primary/10 text-primary"
              )}
              href="/creator"
              onClick={() => setOpen(false)}
            >
              Creator
            </Link>
          ) : null}
          {adminOverride ? (
            <Link
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground",
                isActive("/admin") && "bg-primary/10 text-primary"
              )}
              href="/admin"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          ) : null}
        </>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-[4.5rem] items-center justify-between py-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">{nav}</nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Button
                href="/profile"
                icon={<UserAvatar name={profileName} size="sm" src={profileImage} />}
                variant="secondary"
              >
                Profile
              </Button>
              <Button
                icon={<LogOut className="size-4" />}
                onClick={() => setConfirmLogout(true)}
                variant="ghost"
              >
                Logout
              </Button>
            </>
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
                <>
                  <Button
                    href="/profile"
                    icon={<UserAvatar name={profileName} size="sm" src={profileImage} />}
                    variant="secondary"
                  >
                    Profile
                  </Button>
                  <Button
                    icon={<LogOut className="size-4" />}
                    onClick={() => setConfirmLogout(true)}
                    variant="ghost"
                  >
                    Logout
                  </Button>
                </>
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
