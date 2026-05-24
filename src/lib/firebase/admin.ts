import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;

function serviceAccountFromEnv(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as ServiceAccount;
      if (parsed.projectId && parsed.clientEmail && parsed.privateKey) return parsed;
    } catch {
      return null;
    }
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const parsed = JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as ServiceAccount;
      if (parsed.projectId && parsed.clientEmail && parsed.privateKey) return parsed;
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isFirebaseAdminConfigured() {
  return Boolean(
    serviceAccountFromEnv() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_CONFIG ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getAdminApp() {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  const serviceAccount = serviceAccountFromEnv();
  cachedApp = initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId: serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export async function verifyFirebaseBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Sign in again before continuing.");
  }

  return getAdminAuth().verifyIdToken(token);
}
