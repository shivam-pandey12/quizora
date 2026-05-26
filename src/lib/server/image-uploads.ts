import "server-only";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  getAdminDb,
  getAdminStorageBucket,
  getStorageBucketCandidates,
  verifyFirebaseBearerToken
} from "@/lib/firebase/admin";

type UploadKind = "quiz-cover" | "question-image" | "option-image";
type DeleteKind = "quiz-cover" | "question-image" | "option-image";
type RawData = Record<string, unknown>;

const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function cleanText(value: FormDataEntryValue | null, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getProfile(uid: string) {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  return snapshot.exists ? (snapshot.data() ?? {}) : {};
}

function isAdmin(profile: RawData) {
  return profile.role === "admin";
}

function canEditQuiz(quiz: RawData, decoded: DecodedIdToken, profile: RawData) {
  if (isAdmin(profile)) return true;
  return (
    profile.creatorStatus === "approved" &&
    asString(quiz.ownerId) === decoded.uid &&
    asString(quiz.ownerType) === "creator" &&
    asString(quiz.status) !== "published" &&
    ["draft", "rejected"].includes(asString(quiz.reviewStatus, "draft"))
  );
}

async function requireEditableQuiz(quizId: string, decoded: DecodedIdToken, profile: RawData) {
  if (!quizId) throw new Error("quizId is required.");
  const snapshot = await getAdminDb().collection("quizzes").doc(quizId).get();
  if (!snapshot.exists) throw new Error("Quiz was not found.");
  const quiz = snapshot.data() ?? {};
  if (!canEditQuiz(quiz, decoded, profile)) {
    throw new Error("You do not have permission to edit this quiz image.");
  }
  return { snapshot, quiz };
}

async function requireEditableQuestion({
  quizId,
  questionId,
  decoded,
  profile
}: {
  quizId: string;
  questionId: string;
  decoded: DecodedIdToken;
  profile: RawData;
}) {
  if (!questionId) throw new Error("questionId is required.");
  await requireEditableQuiz(quizId, decoded, profile);
  const snapshot = await getAdminDb().collection("questions").doc(questionId).get();
  if (!snapshot.exists) throw new Error("Question was not found.");
  const question = snapshot.data() ?? {};
  if (asString(question.quizId) !== quizId) throw new Error("Question does not belong to this quiz.");
  return { snapshot, question };
}

function validateFile(file: File) {
  const extension = allowedImageTypes.get(file.type);
  if (!extension) throw new Error("Upload a JPG, PNG, or WebP image under 5MB.");
  if (file.size <= 0) throw new Error("Choose a valid image file.");
  if (file.size > maxImageBytes) throw new Error("Upload a JPG, PNG, or WebP image under 5MB.");
  return extension;
}

function safeStorageFileName(file: File, extension: string) {
  const original = file.name.replace(/\.[^.]+$/, "").toLowerCase();
  const cleanBase = original.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${cleanBase || "image"}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
}

function expectedPrefix(kind: UploadKind | DeleteKind, quizId: string, questionId = "", optionId = "") {
  if (kind === "quiz-cover") return `quizora/quizzes/${quizId}/cover/`;
  if (kind === "question-image") return `quizora/quizzes/${quizId}/questions/${questionId}/`;
  return `quizora/quizzes/${quizId}/questions/${questionId}/options/${optionId}/`;
}

function uploadPath(kind: UploadKind, quizId: string, questionId: string, optionId: string, fileName: string) {
  return `${expectedPrefix(kind, quizId, questionId, optionId)}${fileName}`;
}

function downloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function isMissingBucketError(error: unknown) {
  const data = error as { code?: unknown; message?: unknown };
  const message = typeof data?.message === "string" ? data.message.toLowerCase() : "";
  return data?.code === 404 || (message.includes("bucket") && message.includes("does not exist"));
}

function bucketFromDownloadUrl(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const bucketIndex = segments.indexOf("b");
    return bucketIndex >= 0 ? decodeURIComponent(segments[bucketIndex + 1] ?? "") : "";
  } catch {
    return "";
  }
}

async function saveToStorageBucket({
  path,
  buffer,
  contentType,
  token,
  uploadedBy,
  quizId,
  questionId,
  optionId
}: {
  path: string;
  buffer: Buffer;
  contentType: string;
  token: string;
  uploadedBy: string;
  quizId: string;
  questionId: string;
  optionId: string;
}) {
  const candidates = getStorageBucketCandidates();

  for (const bucketName of candidates) {
    const bucket = getAdminStorageBucket(bucketName);
    try {
      await bucket.file(path).save(buffer, {
        contentType,
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=31536000",
          metadata: {
            firebaseStorageDownloadTokens: token,
            uploadedBy,
            quizId,
            questionId,
            optionId
          }
        }
      });
      return bucket;
    } catch (caught) {
      if (!isMissingBucketError(caught)) throw caught;
    }
  }

  throw new Error(
    `Firebase Storage bucket was not found. Tried: ${candidates.join(", ") || "none"}. Create Firebase Storage for this project or set FIREBASE_STORAGE_BUCKET to the exact bucket name.`
  );
}

async function deletePathIfOwned(path: string, prefix: string, imageUrl = "") {
  if (!path || !path.startsWith(prefix)) throw new Error("Image path does not match this editor context.");
  const bucketName = bucketFromDownloadUrl(imageUrl);
  await getAdminStorageBucket(bucketName || undefined)
    .file(path)
    .delete({ ignoreNotFound: true })
    .catch(() => undefined);
}

function normalizeOptions(options: unknown) {
  return Array.isArray(options)
    ? options.map((option) => ({
        ...(option && typeof option === "object" ? (option as RawData) : {}),
        id: asString((option as RawData)?.id),
        text: asString((option as RawData)?.text),
        imageUrl: asString((option as RawData)?.imageUrl),
        imagePath: asString((option as RawData)?.imagePath),
        imageAlt: asString((option as RawData)?.imageAlt)
      }))
    : [];
}

async function applyMetadata({
  kind,
  quizId,
  questionId,
  optionId,
  url,
  path,
  alt,
  caption
}: {
  kind: UploadKind;
  quizId: string;
  questionId: string;
  optionId: string;
  url: string;
  path: string;
  alt: string;
  caption: string;
}) {
  const db = getAdminDb();
  if (kind === "quiz-cover") {
    await db.collection("quizzes").doc(quizId).set(
      {
        coverImageUrl: url,
        coverImagePath: path,
        coverImageAlt: alt,
        coverImageCaption: caption,
        thumbnailUrl: url,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return;
  }

  const questionRef = db.collection("questions").doc(questionId);
  if (kind === "question-image") {
    await questionRef.set(
      {
        imageUrl: url,
        imagePath: path,
        imageAlt: alt,
        imageCaption: caption,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return;
  }

  const questionSnapshot = await questionRef.get();
  const question = questionSnapshot.data() ?? {};
  const options = normalizeOptions(question.options);
  if (!options.some((option) => option.id === optionId)) throw new Error("Option was not found.");
  await questionRef.update({
    options: options.map((option) =>
      option.id === optionId
        ? { ...option, imageUrl: url, imagePath: path, imageAlt: alt }
        : option
    ),
    updatedAt: FieldValue.serverTimestamp()
  });
}

async function clearMetadata({
  kind,
  quizId,
  questionId,
  optionId,
  url
}: {
  kind: DeleteKind;
  quizId: string;
  questionId: string;
  optionId: string;
  url: string;
}) {
  const db = getAdminDb();
  if (kind === "quiz-cover") {
    const snapshot = await db.collection("quizzes").doc(quizId).get();
    const quiz = snapshot.data() ?? {};
    const payload: RawData = {
      coverImageUrl: "",
      coverImagePath: "",
      coverImageAlt: "",
      coverImageCaption: "",
      updatedAt: FieldValue.serverTimestamp()
    };
    if (asString(quiz.thumbnailUrl) === url) payload.thumbnailUrl = "";
    await snapshot.ref.set(payload, { merge: true });
    return;
  }

  const questionRef = db.collection("questions").doc(questionId);
  if (kind === "question-image") {
    await questionRef.set(
      {
        imageUrl: "",
        imagePath: "",
        imageAlt: "",
        imageCaption: "",
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return;
  }

  const questionSnapshot = await questionRef.get();
  const question = questionSnapshot.data() ?? {};
  const options = normalizeOptions(question.options);
  await questionRef.update({
    options: options.map((option) =>
      option.id === optionId
        ? { ...option, imageUrl: "", imagePath: "", imageAlt: "" }
        : option
    ),
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function handleImageUpload(request: Request, kind: UploadKind) {
  const decoded = await verifyFirebaseBearerToken(request);
  const profile = await getProfile(decoded.uid);
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Choose an image file before uploading.");

  const quizId = cleanText(formData.get("quizId"), 180);
  const questionId = cleanText(formData.get("questionId"), 180);
  const optionId = cleanText(formData.get("optionId"), 180);
  const alt = cleanText(formData.get("alt"), 220);
  const caption = cleanText(formData.get("caption"), 320);

  if (kind === "quiz-cover") await requireEditableQuiz(quizId, decoded, profile);
  if (kind === "question-image" || kind === "option-image") {
    await requireEditableQuestion({ quizId, questionId, decoded, profile });
  }
  if (kind === "option-image" && !optionId) throw new Error("optionId is required.");

  const extension = validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = safeStorageFileName(file, extension);
  const path = uploadPath(kind, quizId, questionId, optionId, fileName);
  const token = randomUUID();
  const bucket = await saveToStorageBucket({
    path,
    buffer,
    contentType: file.type,
    token,
    uploadedBy: decoded.uid,
    quizId,
    questionId,
    optionId
  });

  const url = downloadUrl(bucket.name, path, token);
  await applyMetadata({ kind, quizId, questionId, optionId, url, path, alt, caption });

  return { imageUrl: url, imagePath: path, imageAlt: alt, imageCaption: caption };
}

export async function handleImageDelete(request: Request) {
  const decoded = await verifyFirebaseBearerToken(request);
  const profile = await getProfile(decoded.uid);
  const body = (await request.json().catch(() => ({}))) as RawData;
  const kind = asString(body.kind) as DeleteKind;
  const quizId = asString(body.quizId);
  const questionId = asString(body.questionId);
  const optionId = asString(body.optionId);
  const path = asString(body.imagePath);
  const url = asString(body.imageUrl);

  if (!["quiz-cover", "question-image", "option-image"].includes(kind)) {
    throw new Error("Unknown image delete request.");
  }
  if (kind === "quiz-cover") await requireEditableQuiz(quizId, decoded, profile);
  if (kind === "question-image" || kind === "option-image") {
    await requireEditableQuestion({ quizId, questionId, decoded, profile });
  }
  if (kind === "option-image" && !optionId) throw new Error("optionId is required.");

  await deletePathIfOwned(path, expectedPrefix(kind, quizId, questionId, optionId), url);
  await clearMetadata({ kind, quizId, questionId, optionId, url });
  return { ok: true };
}
