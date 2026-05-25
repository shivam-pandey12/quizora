import type { User } from "firebase/auth";

export type ImageUploadKind = "quiz-cover" | "question-image" | "option-image";

export interface ImageMetadata {
  imageUrl: string;
  imagePath: string;
  imageAlt: string;
  imageCaption?: string;
}

export interface ImageUploadTarget {
  kind: ImageUploadKind;
  quizId: string;
  questionId?: string;
  optionId?: string;
}

const maxImageBytes = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File) {
  if (!allowedTypes.includes(file.type)) {
    return "Upload a JPG, PNG, or WebP image under 5MB.";
  }
  if (file.size > maxImageBytes) {
    return "Upload a JPG, PNG, or WebP image under 5MB.";
  }
  if (!file.size) return "Choose a valid image file.";
  return "";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Image request failed.");
  return data as T;
}

function endpoint(kind: ImageUploadKind) {
  if (kind === "quiz-cover") return "/api/uploads/quiz-cover";
  if (kind === "question-image") return "/api/uploads/question-image";
  return "/api/uploads/option-image";
}

export async function uploadImage({
  user,
  file,
  target,
  alt,
  caption
}: {
  user: User;
  file: File;
  target: ImageUploadTarget;
  alt: string;
  caption?: string;
}) {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);
  const token = await user.getIdToken();
  const body = new FormData();
  body.append("file", file);
  body.append("quizId", target.quizId);
  if (target.questionId) body.append("questionId", target.questionId);
  if (target.optionId) body.append("optionId", target.optionId);
  body.append("alt", alt);
  body.append("caption", caption ?? "");

  const response = await fetch(endpoint(target.kind), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body
  });
  return parseResponse<ImageMetadata>(response);
}

export async function deleteImage({
  user,
  target,
  imagePath,
  imageUrl
}: {
  user: User;
  target: ImageUploadTarget;
  imagePath: string;
  imageUrl: string;
}) {
  const token = await user.getIdToken();
  const response = await fetch("/api/uploads/delete-image", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ ...target, imagePath, imageUrl })
  });
  return parseResponse<{ ok: true }>(response);
}
