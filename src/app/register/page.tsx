import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a Quizora account and prepare your player profile.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Create your player profile, save quiz results, and start building XP, streaks, and badges."
    >
      <RegisterForm />
    </AuthCard>
  );
}
