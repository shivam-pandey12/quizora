"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { auth, firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { createOrGetUserProfile } from "@/lib/firebase/users";
import type { UserProfile } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authReady: boolean;
  authError: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function ensureAuth() {
  if (!auth) throw new Error(firebaseSetupMessage);
  return auth;
}

export function getFriendlyAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Firebase is not configured")) return error.message;
    if (error.message.includes("auth/invalid-credential")) {
      return "The email or password did not match a Quizora account.";
    }
    if (error.message.includes("auth/email-already-in-use")) {
      return "That email already has a Quizora account.";
    }
    if (error.message.includes("auth/weak-password")) {
      return "Use a stronger password with at least six characters.";
    }
    if (error.message.includes("auth/popup")) {
      return "The Google sign-in window could not complete. Try again.";
    }
    return error.message;
  }

  return "Something went wrong while talking to Firebase Auth.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setAuthError(firebaseSetupMessage);
      return;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await createOrGetUserProfile(nextUser);
        setProfile(nextProfile);
        setAuthError(null);
      } catch (error) {
        setProfile(null);
        setAuthError(getFriendlyAuthError(error));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const clientAuth = ensureAuth();
    await signInWithEmailAndPassword(clientAuth, email, password);
  }, []);

  const registerWithEmail = useCallback(
    async (displayName: string, email: string, password: string) => {
      const clientAuth = ensureAuth();
      const result = await createUserWithEmailAndPassword(clientAuth, email, password);

      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }

      await createOrGetUserProfile(result.user);
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const clientAuth = ensureAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(clientAuth, provider);
  }, []);

  const logout = useCallback(async () => {
    const clientAuth = ensureAuth();
    await signOut(clientAuth);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const nextProfile = await createOrGetUserProfile(user);
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authReady: isFirebaseConfigured,
      authError,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshProfile
    }),
    [
      user,
      profile,
      loading,
      authError,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
