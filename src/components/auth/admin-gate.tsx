"use client";

import { LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, authReady, authError } = useAuth();

  if (!authReady) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Firebase setup is required"
        description={firebaseSetupMessage}
      />
    );
  }

  if (loading) return <LoadingSkeleton variant="page" />;

  if (!user) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Admin login required"
        description="Sign in with an admin account to access Quizora Studio."
        actionHref="/login?next=/admin"
        actionLabel="Sign in"
      />
    );
  }

  const adminOverride = hasAdminAccess({ email: user.email, profile });

  if ((authError || !profile) && !adminOverride) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Profile role could not be loaded"
        description={
          authError ||
          "Quizora needs your Firestore profile before admin access can be checked."
        }
      />
    );
  }

  if (!adminOverride) {
    return (
      <div className="space-y-5">
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="This account is signed in but does not have the admin role. Quizora currently checks profile.role on the client; production hardening still needs custom claims, server validation, and deployed/tested Firestore rules."
        />
        <div className="flex justify-center">
          <Button href="/dashboard" variant="secondary">
            Return to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p>
            Admin access loaded from your user profile or bootstrap admin email.
            This is client-side gating and must be hardened with claims/server validation before serious production use.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
