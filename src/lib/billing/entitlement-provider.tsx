"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { getAdminUnlockedPlan, getFreePlan, getPlanLimit, hasPlanFeature } from "@/lib/billing/plans";
import {
  getEffectiveEntitlement,
  getEffectivePlan,
  listUserEntitlements
} from "@/lib/firestore/billing";
import { useAuth } from "@/lib/auth/auth-provider";
import type { BillingPlan, Entitlement } from "@/types/domain";

interface EntitlementContextValue {
  entitlements: Entitlement[];
  entitlement: Entitlement | null;
  plan: BillingPlan;
  loading: boolean;
  error: string | null;
  refreshEntitlements: () => Promise<void>;
  hasFeature: (featureKey: string) => boolean;
  getLimit: (limitKey: string) => number;
}

const EntitlementContext = createContext<EntitlementContextValue | undefined>(undefined);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setEntitlements(await listUserEntitlements(user.uid));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load billing access.");
      setEntitlements([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshEntitlements();
  }, [authLoading, refreshEntitlements]);

  const value = useMemo<EntitlementContextValue>(() => {
    const adminOverride = hasAdminAccess({ email: user?.email, profile });
    const entitlement = adminOverride ? null : getEffectiveEntitlement(entitlements);
    const plan = adminOverride
      ? getAdminUnlockedPlan()
      : getEffectivePlan(entitlements) || getFreePlan();
    return {
      entitlements,
      entitlement,
      plan,
      loading,
      error,
      refreshEntitlements,
      hasFeature: (featureKey: string) => hasPlanFeature(plan, featureKey),
      getLimit: (limitKey: string) => getPlanLimit(plan, limitKey)
    };
  }, [entitlements, error, loading, profile, refreshEntitlements, user?.email]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) throw new Error("useEntitlement must be used inside EntitlementProvider.");
  return context;
}
