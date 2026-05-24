"use client";

import { Chrome, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFriendlyAuthError, useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";

export function RegisterForm() {
  const { registerWithEmail, loginWithGoogle, authReady, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(authReady ? null : firebaseSetupMessage);
  const [submitting, setSubmitting] = useState<"email" | "google" | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!authReady || authLoading || !user) return;
    setRedirecting(true);
    router.replace("/dashboard");
    router.refresh();
  }, [authLoading, authReady, router, user]);

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting("email");
    try {
      await registerWithEmail(displayName, email, password);
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
        Display name
        <Input
          autoComplete="name"
          disabled={!authReady || busy}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Quizora Player"
          value={displayName}
        />
      </label>
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
          autoComplete="new-password"
          disabled={!authReady || busy}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least six characters"
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
        icon={<UserPlus className="size-4" />}
        type="submit"
      >
        {submitting === "email" || redirecting ? "Creating account..." : "Create account"}
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
        Already have an account?{" "}
        <Link className="font-semibold text-primary" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
