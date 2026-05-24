#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const results = [];

function rel(filePath) {
  return filePath.replace(root + path.sep, "").replace(/\\/g, "/");
}

function read(filePath) {
  try {
    return fs.readFileSync(path.join(root, filePath), "utf8");
  } catch {
    return "";
  }
}

function exists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function pass(message) {
  results.push({ level: "pass", message });
}

function warn(message) {
  results.push({ level: "warn", message });
}

function fail(message) {
  results.push({ level: "fail", message });
}

function parseEnvKeys(filePath) {
  const content = read(filePath);
  const keys = new Set();
  content.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.add(match[1]);
  });
  return keys;
}

function runtimeEnvKeys() {
  const keys = new Set(Object.keys(process.env));
  [".env.local", ".env", ".env.production"].forEach((filePath) => {
    parseEnvKeys(filePath).forEach((key) => keys.add(key));
  });
  return keys;
}

function checkFile(filePath, label = filePath) {
  if (exists(filePath)) pass(`${label} present`);
  else fail(`${label} missing`);
}

function checkEnvExample(requiredKeys) {
  const exampleKeys = parseEnvKeys(".env.example");
  requiredKeys.forEach((key) => {
    if (exampleKeys.has(key)) pass(`.env.example documents ${key}`);
    else fail(`.env.example is missing ${key}`);
  });
}

function checkRuntimeEnv(requiredKeys, label) {
  const keys = runtimeEnvKeys();
  const missing = requiredKeys.filter((key) => !keys.has(key));
  if (missing.length) warn(`${label} not found in current env files/process: ${missing.join(", ")}`);
  else pass(`${label} present in current env files/process`);
}

function checkAnyRuntimeEnv(groups, label) {
  const keys = runtimeEnvKeys();
  const matched = groups.some((group) => group.every((key) => keys.has(key)));
  if (matched) pass(`${label} present in current env files/process`);
  else warn(`${label} not found in current env files/process`);
}

function checkPackageScripts() {
  const packageJson = JSON.parse(read("package.json") || "{}");
  const scripts = packageJson.scripts || {};
  ["typecheck", "lint", "build", "start", "launch:audit"].forEach((script) => {
    if (scripts[script]) pass(`npm script ${script} present`);
    else fail(`npm script ${script} missing`);
  });
}

function checkFirebaseConfig() {
  checkFile("firebase.json");
  checkFile(".firebaserc");
  checkFile("apphosting.yaml");
  checkFile("firestore.rules");
  checkFile("firestore.indexes.json");
  const firebaseJson = JSON.parse(read("firebase.json") || "{}");
  if (firebaseJson.apphosting?.backendId) pass("Firebase App Hosting backendId configured");
  else warn("Firebase App Hosting backendId is not configured in firebase.json");
  if (firebaseJson.firestore?.database === "(default)") pass("Firestore database is configured as (default)");
  else warn("Firestore database is not configured as (default) in firebase.json");
  if (firebaseJson.firestore?.location === "asia-south2") pass("Firestore location documents asia-south2");
  else warn("Firestore location is not asia-south2 in firebase.json");
}

function checkRoutes() {
  [
    "src/app/page.tsx",
    "src/app/quizzes/page.tsx",
    "src/app/leaderboard/page.tsx",
    "src/app/pricing/page.tsx",
    "src/app/docs/page.tsx",
    "src/app/docs/[slug]/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/refund/page.tsx",
    "src/app/contact/page.tsx",
    "src/app/sitemap.ts",
    "src/app/robots.ts",
    "src/app/api/billing/create-order/route.ts",
    "src/app/api/billing/verify-payment/route.ts",
    "src/app/api/billing/razorpay-webhook/route.ts",
    "src/app/api/attempts/start/route.ts",
    "src/app/api/attempts/submit/route.ts",
    "src/app/admin/page.tsx",
    "src/app/admin/security/page.tsx"
  ].forEach((filePath) => checkFile(filePath));
}

function checkDocs() {
  [
    "README.md",
    "docs/phase-15-launch-prep.md",
    "docs/env-production.md",
    "docs/firebase-deploy.md",
    "docs/github-upload.md",
    "docs/razorpay-live-checklist.md",
    "docs/seo-launch-checklist.md",
    "docs/post-launch-monitoring.md",
    "docs/rollback-plan.md",
    "docs/launch-smoke-test.md",
    "docs/deployment-checklist.md",
    "docs/known-limitations.md"
  ].forEach((filePath) => checkFile(filePath));
}

function checkGitHubReadiness() {
  checkFile(".gitignore");
  checkFile(".github/workflows/ci.yml", "GitHub CI workflow");
  const gitignore = read(".gitignore");
  [
    "node_modules",
    ".next",
    ".env",
    ".env.*",
    "!.env.example",
    "firebase-adminsdk*.json"
  ].forEach((pattern) => {
    if (gitignore.includes(pattern)) pass(`.gitignore protects ${pattern}`);
    else fail(`.gitignore is missing ${pattern}`);
  });
}

function scanExampleForSecrets() {
  const envExample = read(".env.example");
  const riskySnippets = [
    "-----BEGIN PRIVATE KEY-----",
    "RAZORPAY_KEY_SECRET=rzp_",
    "RAZORPAY_WEBHOOK_SECRET=whsec_"
  ];
  const hits = riskySnippets.filter((snippet) => envExample.includes(snippet));
  if (hits.length) fail(`.env.example appears to contain real secret material: ${hits.join(", ")}`);
  else pass(".env.example contains placeholders instead of obvious secret material");
}

function scanForClientSecretNames() {
  const sourceFiles = [];
  function walk(dir) {
    if (!exists(dir)) return;
    fs.readdirSync(path.join(root, dir), { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(full);
    });
  }
  walk("src");
  const clientPublicLeakNames = [
    "NEXT_PUBLIC_RAZORPAY_KEY_SECRET",
    "NEXT_PUBLIC_RAZORPAY_WEBHOOK_SECRET",
    "NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT",
    "NEXT_PUBLIC_ATTEMPT_SESSION_SECRET"
  ];
  const hits = [];
  sourceFiles.forEach((filePath) => {
    const content = read(filePath);
    clientPublicLeakNames.forEach((name) => {
      if (content.includes(name)) hits.push(`${rel(path.join(root, filePath))}: ${name}`);
    });
  });
  if (hits.length) fail(`client-exposed secret env names found: ${hits.join("; ")}`);
  else pass("No obvious NEXT_PUBLIC secret env names found in src");
}

const clientFirebaseKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_APP_URL"
];

const billingKeys = [
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "BILLING_CURRENCY"
];

const launchDocKeys = [
  ...clientFirebaseKeys,
  ...billingKeys,
  "BILLING_TEST_MODE",
  "BILLING_SUPPORT_EMAIL",
  "SUPPORT_EMAIL",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_SERVICE_ACCOUNT_BASE64",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "ATTEMPT_SESSION_SECRET",
  "TRUSTED_SCORING_ENABLED",
  "NEXT_PUBLIC_TRUSTED_SCORING_ENABLED",
  "COMPETITIVE_MODE_ENABLED"
];

console.log("Quizora launch audit");
console.log("---------------------");
checkPackageScripts();
checkFirebaseConfig();
checkGitHubReadiness();
checkRoutes();
checkDocs();
checkEnvExample(launchDocKeys);
checkRuntimeEnv(clientFirebaseKeys, "client Firebase env");
checkRuntimeEnv(["NEXT_PUBLIC_APP_URL"], "production app URL env");
checkRuntimeEnv(billingKeys, "Razorpay env");
checkAnyRuntimeEnv(
  [
    ["FIREBASE_SERVICE_ACCOUNT_JSON"],
    ["FIREBASE_SERVICE_ACCOUNT_BASE64"],
    ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]
  ],
  "Firebase Admin SDK credentials"
);
checkRuntimeEnv(["ATTEMPT_SESSION_SECRET"], "trusted scoring session secret");
scanExampleForSecrets();
scanForClientSecretNames();

const counts = {
  pass: results.filter((item) => item.level === "pass").length,
  warn: results.filter((item) => item.level === "warn").length,
  fail: results.filter((item) => item.level === "fail").length
};

results.forEach((item) => {
  const marker = item.level === "pass" ? "PASS" : item.level === "warn" ? "WARN" : "FAIL";
  console.log(`${marker} ${item.message}`);
});

console.log("---------------------");
console.log(`Launch audit complete: ${counts.pass} passed, ${counts.warn} warnings, ${counts.fail} failures.`);

if (counts.warn) {
  console.log("Warnings are expected on local machines when production env values are not loaded.");
}

process.exitCode = counts.fail ? 1 : 0;
