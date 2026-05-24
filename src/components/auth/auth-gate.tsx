"use client";

import { LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage } from "@/lib/firebase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, authReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authReady && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authReady, loading, pathname, router, user]);

  if (!authReady) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Firebase setup is required"
        description={firebaseSetupMessage}
      />
    );
  }

  if (loading || !user) {
    return <LoadingSkeleton variant="page" />;
  }

  return children;
}
