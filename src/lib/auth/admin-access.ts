import type { UserProfile } from "@/types/domain";

export const bootstrapAdminEmails = ["shivam63pandey@gmail.com"];

export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isBootstrapAdminEmail(email: string | null | undefined) {
  return bootstrapAdminEmails.includes(normalizeEmail(email));
}

export function hasAdminAccess(input: {
  email?: string | null;
  profile?: UserProfile | null;
}) {
  return (
    input.profile?.role === "admin" ||
    isBootstrapAdminEmail(input.email) ||
    isBootstrapAdminEmail(input.profile?.email)
  );
}
