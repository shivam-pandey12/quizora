import "server-only";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb, verifyFirebaseBearerToken } from "@/lib/firebase/admin";
import { hasAdminAccess } from "@/lib/auth/admin-access";

export const trustedScoringEnabled =
  process.env.TRUSTED_SCORING_ENABLED !== "false";

export function requireAttemptSessionSecret() {
  const secret = process.env.ATTEMPT_SESSION_SECRET;
  if (!secret || secret.trim().length < 24) {
    throw new Error("ATTEMPT_SESSION_SECRET is missing or too short for trusted scoring.");
  }
  return secret;
}

export function randomNonce(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashRequestValue(value: string | null) {
  return value ? sha256(value).slice(0, 32) : "";
}

export function signAttemptSession({
  sessionId,
  userId,
  nonce,
  expiresAtMs
}: {
  sessionId: string;
  userId: string;
  nonce: string;
  expiresAtMs: number;
}) {
  const payload = `${sessionId}.${userId}.${nonce}.${expiresAtMs}`;
  const signature = crypto
    .createHmac("sha256", requireAttemptSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAttemptSessionToken({
  token,
  sessionId,
  userId,
  nonce,
  expiresAtMs
}: {
  token: string;
  sessionId: string;
  userId: string;
  nonce: string;
  expiresAtMs: number;
}) {
  const expected = signAttemptSession({ sessionId, userId, nonce, expiresAtMs });
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Send a valid JSON request body.");
  }
}

export function apiError(caught: unknown, fallback: string, status = 400) {
  const message = caught instanceof Error ? caught.message : fallback;
  const setupStatus =
    message.includes("ATTEMPT_SESSION_SECRET") || message.includes("Firebase")
      ? 503
      : status;
  return NextResponse.json({ error: message }, { status: setupStatus });
}

export async function requireServerUser(request: Request) {
  const decoded = await verifyFirebaseBearerToken(request);
  return decoded;
}

export async function requireServerAdmin(request: Request) {
  const decoded = await requireServerUser(request);
  const profileSnapshot = await getAdminDb().collection("users").doc(decoded.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  const admin = hasAdminAccess({
    email: decoded.email ?? null,
    profile: profile
      ? {
          email: typeof profile.email === "string" ? profile.email : decoded.email ?? "",
          role: profile.role === "admin" ? "admin" : "user"
        } as never
      : null
  });
  if (!admin) throw new Error("Admin access is required.");
  return decoded;
}

export function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

export function requestUserAgent(request: Request) {
  return request.headers.get("user-agent") || "";
}
