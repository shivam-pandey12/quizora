"use client";

import { AuthGate } from "@/components/auth/auth-gate";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-8 sm:py-10">
      <AuthGate>{children}</AuthGate>
    </div>
  );
}
