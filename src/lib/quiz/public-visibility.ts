import type { Quiz } from "@/types/domain";

export function isPublicApprovedQuiz(quiz: Pick<
  Quiz,
  "status" | "visibility" | "publishScope" | "ownerType" | "reviewStatus"
>) {
  if (quiz.status !== "published") return false;
  if (quiz.visibility !== "public") return false;
  if (quiz.publishScope !== "global") return false;
  return quiz.ownerType === "admin" || quiz.reviewStatus === "approved";
}
