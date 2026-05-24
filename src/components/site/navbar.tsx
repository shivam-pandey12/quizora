"use client";

import { LogOut, Menu, X } from "lucide-react";
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

const publicLinks = [
  { href: "/quizzes", label: "Quizzes" },
  { href: "/rooms", label: "Rooms" },
  { href: "/matchmaking", label: "Matchmaking" },
  { href: "/categories", label: "Categories" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" }
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
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4 py-4">
        <BrandLogo className="shrink-0" />
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">{nav}</nav>
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
