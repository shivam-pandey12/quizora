import type { UserProfile } from "@/types/domain";

export function hasAdminAccess(input: {
  email?: string | null;
  profile?: UserProfile | null;
}) {
  return input.profile?.role === "admin";
}
