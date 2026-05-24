"use client";

import { Chrome, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFriendlyAuthError, useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";

export function LoginForm() {
  const { loginWithEmail, loginWithGoogle, authReady, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(authReady ? null : firebaseSetupMessage);
  const [submitting, setSubmitting] = useState<"email" | "google" | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const next = useMemo(() => {
    const requested = searchParams.get("next");
    if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.startsWith("/login")) {
      return "/dashboard";
    }
    return requested;
  }, [searchParams]);

  useEffect(() => {
    if (!authReady || authLoading || !user) return;
    setRedirecting(true);
    router.replace(next);
    router.refresh();
  }, [authLoading, authReady, next, router, user]);

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting("email");
    try {
      await loginWithEmail(email, password);
      setRedirecting(true);
    } catch (caught) {
      setError(getFriendlyAuthError(caught));
      setRedirecting(false);
    } finally {
      setSubmitting(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting("google");
    try {
      await loginWithGoogle();
      setRedirecting(true);
    } catch (caught) {
      setError(getFriendlyAuthError(caught));
      setRedirecting(false);
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null || authLoading || redirecting;

  return (
    <form className="grid gap-4" onSubmit={handleEmail}>
      <label className="grid gap-2 text-sm font-semibold">
        Email
        <Input
          autoComplete="email"
          disabled={!authReady || busy}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Password
        <Input
          autoComplete="current-password"
          disabled={!authReady || busy}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          type="password"
          value={password}
        />
      </label>
      {error ? (
        <p className="rounded-2xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        disabled={!authReady || busy}
        fullWidth
        icon={<LogIn className="size-4" />}
        type="submit"
      >
        {submitting === "email" || redirecting ? "Signing in..." : "Sign in"}
      </Button>
      <Button
        disabled={!authReady || busy}
        fullWidth
        icon={<Chrome className="size-4" />}
        onClick={handleGoogle}
        type="button"
        variant="secondary"
      >
        {submitting === "google" ? "Opening Google..." : "Continue with Google"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to Quizora?{" "}
        <Link className="font-semibold text-primary" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
