"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { EntitlementProvider } from "@/lib/billing/entitlement-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <AuthProvider>
          <EntitlementProvider>{children}</EntitlementProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
