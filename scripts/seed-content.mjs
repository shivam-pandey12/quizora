#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStarterContentPack, seedPackId } from "./starter-content/pack.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function loadEnvFile(filePath) {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) return;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  });
}

[".env.local", ".env", ".env.production"].forEach(loadEnvFile);

function serviceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.project_id && !parsed.projectId) parsed.projectId = parsed.project_id;
      if (parsed.client_email && !parsed.clientEmail) parsed.clientEmail = parsed.client_email;
      if (parsed.private_key && !parsed.privateKey) parsed.privateKey = parsed.private_key;
      if (parsed.projectId && parsed.clientEmail && parsed.privateKey) return parsed;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is present but is not valid JSON.");
    }
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const parsed = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
      if (parsed.project_id && !parsed.projectId) parsed.projectId = parsed.project_id;
      if (parsed.client_email && !parsed.clientEmail) parsed.clientEmail = parsed.client_email;
      if (parsed.private_key && !parsed.privateKey) parsed.privateKey = parsed.private_key;
      if (parsed.projectId && parsed.clientEmail && parsed.privateKey) return parsed;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is present but does not decode to valid service account JSON.");
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
}

function getDb() {
  if (!getApps().length) {
    const serviceAccount = serviceAccountFromEnv();
    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      projectId: serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }
  return getFirestore();
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashContent(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validatePack(pack) {
  const errors = [];
  const categorySlugs = new Set();
  const quizSlugs = new Set();
  const questionsByQuiz = new Map();

  assert(pack.categories.length === 16, `Expected 16 categories, found ${pack.categories.length}.`, errors);
  assert(pack.quizzes.length === 48, `Expected 48 quizzes, found ${pack.quizzes.length}.`, errors);
  assert(pack.questions.length === 480, `Expected 480 questions, found ${pack.questions.length}.`, errors);
  assert(pack.badgeDefinitions.length === 24, `Expected 24 badge definitions, found ${pack.badgeDefinitions.length}.`, errors);
  assert(pack.plans.length === 4, `Expected 4 plans, found ${pack.plans.length}.`, errors);

  pack.categories.forEach((category) => {
    assert(category.name.trim().length > 0, `Category ${category.slug} needs a name.`, errors);
    assert(slugPattern.test(category.slug), `Category slug ${category.slug} is not URL-safe.`, errors);
    assert(!categorySlugs.has(category.slug), `Duplicate category slug ${category.slug}.`, errors);
    assert(category.description.length >= 70, `Category ${category.slug} description is too short.`, errors);
    assert(category.status === "active", `Category ${category.slug} must be active.`, errors);
    categorySlugs.add(category.slug);
  });

  pack.quizzes.forEach((quiz) => {
    assert(quiz.title.trim().length > 0, `Quiz ${quiz.slug} needs a title.`, errors);
    assert(slugPattern.test(quiz.slug), `Quiz slug ${quiz.slug} is not URL-safe.`, errors);
    assert(!quizSlugs.has(quiz.slug), `Duplicate quiz slug ${quiz.slug}.`, errors);
    assert(categorySlugs.has(quiz.categorySlug), `Quiz ${quiz.slug} references missing category ${quiz.categorySlug}.`, errors);
    assert(["easy", "medium", "hard", "expert"].includes(quiz.difficulty), `Quiz ${quiz.slug} has invalid difficulty.`, errors);
    assert(quiz.status === "published" && quiz.visibility === "public", `Quiz ${quiz.slug} must be published and public.`, errors);
    assert(quiz.description.length >= 100, `Quiz ${quiz.slug} description is too short.`, errors);
    assert(quiz.questionCount === 10, `Quiz ${quiz.slug} must have 10 questions.`, errors);
    quizSlugs.add(quiz.slug);
  });

  pack.questions.forEach((question) => {
    const list = questionsByQuiz.get(question.quizSlug) || [];
    list.push(question);
    questionsByQuiz.set(question.quizSlug, list);
    assert(quizSlugs.has(question.quizSlug), `Question for missing quiz ${question.quizSlug}.`, errors);
    assert(question.questionText.length >= 20, `Question ${question.quizSlug} #${question.order} text is too short.`, errors);
    assert(["single-choice", "multiple-choice", "true-false"].includes(question.type), `Question ${question.quizSlug} #${question.order} has unsupported type.`, errors);
    assert(question.options.length >= 2, `Question ${question.quizSlug} #${question.order} needs options.`, errors);
    assert(question.explanation.length >= 20, `Question ${question.quizSlug} #${question.order} needs an explanation.`, errors);
    assert(question.points > 0, `Question ${question.quizSlug} #${question.order} needs points.`, errors);
    assert(question.timeLimitSeconds > 0, `Question ${question.quizSlug} #${question.order} needs a timer.`, errors);
    const optionIds = new Set(question.options.map((option) => option.id));
    if (question.type === "multiple-choice") {
      assert(question.correctAnswers.length >= 1, `Multiple-choice question ${question.quizSlug} #${question.order} needs correct answers.`, errors);
      question.correctAnswers.forEach((id) => assert(optionIds.has(id), `Question ${question.quizSlug} #${question.order} has invalid correct answer ${id}.`, errors));
    } else {
      assert(optionIds.has(question.correctAnswer), `Question ${question.quizSlug} #${question.order} correct answer is not an option.`, errors);
    }
  });

  pack.quizzes.forEach((quiz) => {
    const list = questionsByQuiz.get(quiz.slug) || [];
    const orders = new Set(list.map((question) => question.order));
    assert(list.length === 10, `Quiz ${quiz.slug} has ${list.length} questions instead of 10.`, errors);
    assert(orders.size === 10, `Quiz ${quiz.slug} has duplicate question order values.`, errors);
    assert(list.reduce((sum, question) => sum + question.points, 0) === quiz.totalPoints, `Quiz ${quiz.slug} totalPoints does not match questions.`, errors);
  });

  return errors;
}

async function findBySlug(db, collectionName, slug) {
  const snapshot = await db.collection(collectionName).where("slug", "==", slug).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

function starterDoc(collectionName, slug) {
  const singular = collectionName.replace(/s$/, "");
  return `starter-${singular}-${slug}`;
}

function makePayload(data, extra = {}) {
  const base = { ...data, ...extra };
  delete base.categorySlug;
  delete base.quizSlug;
  const seedContentHash = hashContent(base);
  return { ...base, seedContentHash };
}

function queueSet(writes, ref, payload, exists) {
  writes.push({
    ref,
    payload: {
      ...payload,
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp()
    }
  });
}

async function commitWrites(db, writes) {
  let committed = 0;
  for (let index = 0; index < writes.length; index += 450) {
    const batch = db.batch();
    writes.slice(index, index + 450).forEach((write) => {
      batch.set(write.ref, write.payload, { merge: true });
    });
    await batch.commit();
    committed += Math.min(450, writes.length - index);
  }
  return committed;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function run() {
  const pack = getStarterContentPack();
  const errors = validatePack(pack);

  console.log("Quizora starter content seed");
  console.log("----------------------------");
  console.log(`Mode: ${dryRun ? "dry-run" : force ? "force" : "safe import"}`);
  console.log(`Pack: ${pack.seedPackId}@${pack.seedVersion}`);

  if (errors.length) {
    errors.forEach((error) => console.error(`ERROR ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${pack.categories.length} categories, ${pack.quizzes.length} quizzes, ${pack.questions.length} questions, ${pack.badgeDefinitions.length} badges, and ${pack.plans.length} plans.`);

  if (dryRun) {
    console.log("Dry run complete. No Firestore writes were attempted.");
    return;
  }

  const db = getDb();
  const writes = [];
  const categoryIds = new Map();
  const quizIds = new Map();
  const summary = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    quizzesCreated: 0,
    quizzesUpdated: 0,
    questionsCreated: 0,
    questionsUpdated: 0,
    badgesUpdated: 0,
    plansUpdated: 0,
    settingsUpdated: 0,
    dailyChallengesUpdated: 0,
    skippedUnchanged: 0,
    preservedExisting: 0
  };

  for (const category of pack.categories) {
    const existing = await findBySlug(db, "categories", category.slug);
    const ref = existing?.ref || db.collection("categories").doc(starterDoc("categories", category.slug));
    const existingData = existing?.data() || null;
    categoryIds.set(category.slug, ref.id);
    if (existingData && existingData.seedPackId !== seedPackId && !force) {
      summary.preservedExisting += 1;
      continue;
    }
    const payload = makePayload(category);
    if (existingData?.seedContentHash === payload.seedContentHash) {
      summary.skippedUnchanged += 1;
      continue;
    }
    queueSet(writes, ref, payload, Boolean(existing));
    if (existing) summary.categoriesUpdated += 1;
    else summary.categoriesCreated += 1;
  }

  for (const quiz of pack.quizzes) {
    const categoryId = categoryIds.get(quiz.categorySlug);
    if (!categoryId) {
      summary.preservedExisting += 1;
      continue;
    }
    const existing = await findBySlug(db, "quizzes", quiz.slug);
    const ref = existing?.ref || db.collection("quizzes").doc(starterDoc("quizzes", quiz.slug));
    const existingData = existing?.data() || null;
    quizIds.set(quiz.slug, ref.id);
    if (existingData && existingData.seedPackId !== seedPackId && !force) {
      summary.preservedExisting += 1;
      continue;
    }
    const payload = makePayload(quiz, { categoryId });
    if (!existingData?.publishedAt) payload.publishedAt = FieldValue.serverTimestamp();
    if (existingData?.seedContentHash === payload.seedContentHash) {
      summary.skippedUnchanged += 1;
      continue;
    }
    queueSet(writes, ref, payload, Boolean(existing));
    if (existing) summary.quizzesUpdated += 1;
    else summary.quizzesCreated += 1;
  }

  for (const question of pack.questions) {
    const quizId = quizIds.get(question.quizSlug);
    if (!quizId) {
      summary.preservedExisting += 1;
      continue;
    }
    const ref = db.collection("questions").doc(`starter-question-${question.quizSlug}-${String(question.order).padStart(2, "0")}`);
    const existing = await ref.get();
    const existingData = existing.exists ? existing.data() : null;
    if (existingData && existingData.seedPackId !== seedPackId && !force) {
      summary.preservedExisting += 1;
      continue;
    }
    const payload = makePayload(question, { quizId });
    if (existingData?.seedContentHash === payload.seedContentHash) {
      summary.skippedUnchanged += 1;
      continue;
    }
    queueSet(writes, ref, payload, existing.exists);
    if (existing.exists) summary.questionsUpdated += 1;
    else summary.questionsCreated += 1;
  }

  for (const badge of pack.badgeDefinitions) {
    const ref = db.collection("badgeDefinitions").doc(badge.id);
    const existing = await ref.get();
    const payload = makePayload(badge);
    if (existing.data()?.seedContentHash === payload.seedContentHash) {
      summary.skippedUnchanged += 1;
      continue;
    }
    queueSet(writes, ref, payload, existing.exists);
    summary.badgesUpdated += 1;
  }

  for (const plan of pack.plans) {
    const ref = db.collection("plans").doc(plan.id);
    const existing = await ref.get();
    const payload = makePayload(plan);
    if (existing.data()?.seedContentHash === payload.seedContentHash) {
      summary.skippedUnchanged += 1;
      continue;
    }
    queueSet(writes, ref, payload, existing.exists);
    summary.plansUpdated += 1;
  }

  const featuredQuizIds = pack.featured.featuredQuizSlugs.map((slug) => quizIds.get(slug)).filter(Boolean);
  const featuredCategoryIds = pack.featured.featuredCategorySlugs.map((slug) => categoryIds.get(slug)).filter(Boolean);
  const heroQuizId = quizIds.get(pack.featured.heroQuizSlug) || "";
  const dailyQuizId = quizIds.get(pack.featured.dailyChallengeQuizSlug) || heroQuizId;
  const dailyQuiz = pack.quizzes.find((quiz) => quiz.slug === pack.featured.dailyChallengeQuizSlug) || pack.quizzes[0];
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.BILLING_SUPPORT_EMAIL || "";

  const homepagePayload = makePayload({
    id: "homepage",
    public: true,
    featuredQuizIds,
    featuredCategoryIds,
    heroQuizId,
    liveRoomCtaEnabled: true,
    quickMatchCtaEnabled: true,
    classroomCtaEnabled: true,
    seedPackId: pack.seedPackId,
    seedVersion: pack.seedVersion
  });
  queueSet(writes, db.collection("siteSettings").doc("homepage"), homepagePayload, true);
  summary.settingsUpdated += 1;

  const appSettingsPayload = makePayload({
    id: "app",
    public: true,
    supportEmail,
    appAnnouncement: "Welcome to Quizora starter content. Explore published quizzes, daily challenges, and live-room ready topics.",
    maintenanceMode: false,
    allowPublicRooms: true,
    allowQuickMatch: true,
    allowChallengeLinks: true,
    leaderboardEnabled: true,
    dailyChallengeEnabled: true,
    defaultQuestionTimer: 30,
    defaultRoomMaxPlayers: 8,
    defaultBotFillDelay: 30,
    featuredQuizLimit: 6,
    seedPackId: pack.seedPackId,
    seedVersion: pack.seedVersion
  });
  queueSet(writes, db.collection("siteSettings").doc("app"), appSettingsPayload, true);
  summary.settingsUpdated += 1;

  const today = new Date();
  for (let offset = 0; offset < 8; offset += 1) {
    const key = dateKey(addDays(today, offset));
    const challengePayload = makePayload({
      dateKey: key,
      quizId: dailyQuizId,
      quizTitle: dailyQuiz.title,
      categoryId: categoryIds.get(dailyQuiz.categorySlug) || "",
      difficulty: dailyQuiz.difficulty,
      status: offset === 0 ? "active" : "scheduled",
      teaser: offset === 0 ? "Today's polished starter challenge is ready." : "Upcoming Quizora starter challenge.",
      seedPackId: pack.seedPackId,
      seedVersion: pack.seedVersion
    });
    queueSet(writes, db.collection("dailyChallenges").doc(key), challengePayload, true);
    summary.dailyChallengesUpdated += 1;
  }

  const committed = await commitWrites(db, writes);
  console.log(`Committed ${committed} Firestore writes.`);
  Object.entries(summary).forEach(([key, value]) => console.log(`${key}: ${value}`));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
