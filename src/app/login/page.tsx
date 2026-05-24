import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to Quizora and continue your quiz progress.",
  robots: {
    index: false,
    follow: false
  }
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your dashboard, saved results, live rooms, and profile progress."
    >
      <Suspense fallback={<LoadingSkeleton className="h-56" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
