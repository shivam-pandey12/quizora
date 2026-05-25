import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isValidSlug } from "@/lib/firestore/slug";
import { requireServerAdmin, requireServerUser } from "@/lib/server/trusted-utils";

type RawData = Record<string, unknown>;
type ReviewAction = "approve" | "reject" | "archive";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isCreatorProfile(profile: RawData | null) {
  return profile?.role === "admin" || profile?.creatorStatus === "approved";
}

async function readProfile(userId: string) {
  const snapshot = await getAdminDb().collection("users").doc(userId).get();
  return snapshot.exists ? (snapshot.data() ?? {}) : null;
}

async function writeAdminLog({
  admin,
  action,
  targetType,
  targetId,
  targetLabel,
  details
}: {
  admin: DecodedIdToken;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  details: Record<string, unknown>;
}) {
  await getAdminDb()
    .collection("adminLogs")
    .add({
      adminId: admin.uid,
      adminName: admin.name || admin.email || "Admin",
      action,
      targetType,
      targetId,
      targetLabel,
      details,
      createdAt: FieldValue.serverTimestamp()
    })
    .catch(() => undefined);
}

async function validateCreatorQuizQuality(quizId: string) {
  const db = getAdminDb();
  const quizSnapshot = await db.collection("quizzes").doc(quizId).get();
  if (!quizSnapshot.exists) throw new Error("Quiz was not found.");

  const quiz = quizSnapshot.data() ?? {};
  const errors: string[] = [];
  const title = asString(quiz.title).trim();
  const slug = asString(quiz.slug).trim();
  const description = asString(quiz.description).trim();
  const shortDescription = asString(quiz.shortDescription).trim();
  const categoryId = asString(quiz.categoryId).trim();
  const difficulty = asString(quiz.difficulty);

  if (!title) errors.push("Add a quiz title.");
  if (!slug || !isValidSlug(slug)) errors.push("Use a valid URL-safe slug.");
  if (!shortDescription) errors.push("Add a short description.");
  if (!description) errors.push("Add a full description.");
  if (!categoryId) errors.push("Choose a category.");
  if (!["easy", "medium", "hard", "expert"].includes(difficulty)) {
    errors.push("Choose a valid difficulty.");
  }
  if (asString(quiz.ownerType) !== "creator") errors.push("Only creator-owned quizzes can use this review flow.");
  if (asString(quiz.visibility) !== "private") errors.push("Creator submissions must stay private until admin approval.");

  const duplicateSlugSnapshot = await db
    .collection("quizzes")
    .where("slug", "==", slug)
    .limit(2)
    .get();
  if (duplicateSlugSnapshot.docs.some((doc) => doc.id !== quizId)) {
    errors.push("That quiz slug is already used by another quiz.");
  }

  const questionSnapshot = await db
    .collection("questions")
    .where("quizId", "==", quizId)
    .orderBy("order", "asc")
    .limit(250)
    .get();
  const questions = questionSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
  const activeQuestions = questions.filter(({ data }) => asString(data.status, "active") === "active");

  if (activeQuestions.length < 5) errors.push("Add at least five active questions.");

  const orderValues = new Set<number>();
  let totalPoints = 0;
  activeQuestions.forEach(({ data }, index) => {
    const label = `Question ${index + 1}`;
    const type = asString(data.type, "single-choice");
    const options = Array.isArray(data.options)
      ? data.options
          .map((option) => ({
            id: asString((option as RawData)?.id),
            text: asString((option as RawData)?.text).trim()
          }))
          .filter((option) => option.id && option.text)
      : [];
    const optionIds = new Set(options.map((option) => option.id));
    const points = asNumber(data.points);
    const order = asNumber(data.order);

    totalPoints += Math.max(0, points);
    if (!asString(data.questionText).trim()) errors.push(`${label}: add question text.`);
    if (!asString(data.explanation).trim()) errors.push(`${label}: add an explanation.`);
    if (points <= 0) errors.push(`${label}: points must be positive.`);
    if (order <= 0 || orderValues.has(order)) errors.push(`${label}: order must be unique.`);
    orderValues.add(order);

    if (type === "single-choice" || type === "multiple-choice") {
      if (options.length < 2) errors.push(`${label}: add at least two options.`);
    }
    if (type === "single-choice" || type === "true-false") {
      const answer = asString(data.correctAnswer);
      if (!answer || !optionIds.has(answer)) errors.push(`${label}: choose a valid correct answer.`);
    }
    if (type === "multiple-choice") {
      const answers = asStringArray(data.correctAnswers);
      if (!answers.length) errors.push(`${label}: choose at least one correct answer.`);
      if (answers.some((answer) => !optionIds.has(answer))) {
        errors.push(`${label}: all correct answers must match options.`);
      }
    }
    if (type === "text") errors.push(`${label}: text-answer questions are not enabled for creator publishing yet.`);
  });

  if (totalPoints <= 0) errors.push("Total points must be greater than zero.");
  if (errors.length) throw new Error(errors[0]);

  return { quizSnapshot, quiz, activeQuestionCount: activeQuestions.length, totalPoints };
}

async function readCreatorQuizForReview(quizId: string) {
  const quizSnapshot = await getAdminDb().collection("quizzes").doc(quizId).get();
  if (!quizSnapshot.exists) throw new Error("Quiz was not found.");
  const quiz = quizSnapshot.data() ?? {};
  if (asString(quiz.ownerType) !== "creator") {
    throw new Error("Only creator-owned quizzes can use this review flow.");
  }
  return { quizSnapshot, quiz };
}

export async function submitCreatorQuizForReviewServer(request: Request, quizId: string) {
  const decoded = await requireServerUser(request);
  const profile = await readProfile(decoded.uid);
  const admin = profile?.role === "admin";
  if (!isCreatorProfile(profile)) throw new Error("Creator approval is required.");

  const { quizSnapshot, quiz, activeQuestionCount, totalPoints } =
    await validateCreatorQuizQuality(quizId);
  if (!admin && asString(quiz.ownerId) !== decoded.uid) {
    throw new Error("You can submit only your own quizzes.");
  }
  if (asString(quiz.reviewStatus) === "submitted") return;
  if (asString(quiz.reviewStatus) === "approved") {
    throw new Error("Approved quizzes cannot be resubmitted from the creator workspace.");
  }
  if (asString(quiz.publishScope) !== "global") {
    throw new Error("Set this quiz to public review before submitting.");
  }

  await quizSnapshot.ref.update({
    reviewStatus: "submitted",
    status: "draft",
    visibility: "private",
    questionCount: activeQuestionCount,
    totalPoints,
    rejectionNote: "",
    submittedAt: FieldValue.serverTimestamp(),
    updatedBy: decoded.uid,
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function reviewCreatorRequestServer({
  request,
  requestId,
  action,
  note
}: {
  request: Request;
  requestId: string;
  action: "approve" | "reject";
  note: string;
}) {
  const admin = await requireServerAdmin(request);
  const db = getAdminDb();
  const requestRef = db.collection("creatorRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) throw new Error("Creator request was not found.");
  const creatorRequest = requestSnapshot.data() ?? {};
  const userId = asString(creatorRequest.userId, requestId);
  if (!userId) throw new Error("Creator request is missing a user.");
  if (action === "reject" && !note.trim()) throw new Error("Add a rejection note.");

  const status = action === "approve" ? "approved" : "rejected";
  const batch = db.batch();
  batch.update(requestRef, {
    status,
    adminNote: note.trim(),
    reviewedBy: admin.uid,
    reviewedByName: admin.name || admin.email || "Admin",
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  if (action === "approve") {
    batch.set(
      db.collection("users").doc(userId),
      {
        creatorStatus: "approved",
        "teacherProfile.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  await batch.commit();
  await writeAdminLog({
    admin,
    action: `creator_request_${status}`,
    targetType: "creatorRequest",
    targetId: requestId,
    targetLabel: asString(creatorRequest.displayName, userId),
    details: { userId, note: note.trim() }
  });
}

export async function reviewCreatorQuizServer({
  request,
  quizId,
  action,
  note
}: {
  request: Request;
  quizId: string;
  action: ReviewAction;
  note: string;
}) {
  const admin = await requireServerAdmin(request);
  const reviewData =
    action === "approve"
      ? await validateCreatorQuizQuality(quizId)
      : await readCreatorQuizForReview(quizId);
  const { quizSnapshot, quiz } = reviewData;
  const title = asString(quiz.title, quizId);

  if (action === "reject" && !note.trim()) throw new Error("Add a rejection note.");
  if (action === "archive" && !note.trim()) throw new Error("Add an archive note.");

  const common = {
    reviewedBy: admin.uid,
    reviewedByName: admin.name || admin.email || "Admin",
    reviewedAt: FieldValue.serverTimestamp(),
    updatedBy: admin.uid,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (action === "approve") {
    const { activeQuestionCount, totalPoints } = reviewData as Awaited<
      ReturnType<typeof validateCreatorQuizQuality>
    >;
    if (asString(quiz.reviewStatus) !== "submitted") {
      throw new Error("Only submitted creator quizzes can be approved.");
    }
    if (asString(quiz.publishScope) !== "global") {
      throw new Error("Only public-review quizzes can be published publicly.");
    }
    await quizSnapshot.ref.update({
      ...common,
      reviewStatus: "approved",
      status: "published",
      visibility: "public",
      publishScope: "global",
      questionCount: activeQuestionCount,
      totalPoints,
      rejectionNote: "",
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: admin.uid,
      publishedAt: FieldValue.serverTimestamp(),
      creatorEditable: false
    });
  } else if (action === "reject") {
    await quizSnapshot.ref.update({
      ...common,
      reviewStatus: "rejected",
      status: "draft",
      visibility: "private",
      rejectionNote: note.trim(),
      approvedAt: null,
      approvedBy: "",
      publishedAt: null,
      creatorEditable: true
    });
  } else {
    await quizSnapshot.ref.update({
      ...common,
      reviewStatus: "rejected",
      status: "archived",
      visibility: "private",
      rejectionNote: note.trim(),
      publishedAt: null,
      creatorEditable: false
    });
  }

  await writeAdminLog({
    admin,
    action: `creator_quiz_${action}`,
    targetType: "quiz",
    targetId: quizId,
    targetLabel: title,
    details: { note: note.trim(), ownerId: asString(quiz.ownerId) }
  });
}
