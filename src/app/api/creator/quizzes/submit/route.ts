import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/trusted-utils";
import { submitCreatorQuizForReviewServer } from "@/lib/server/creator-review";

export const runtime = "nodejs";

interface SubmitCreatorQuizBody {
  quizId?: string;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<SubmitCreatorQuizBody>(request);
    if (!body.quizId) throw new Error("Choose a quiz to submit.");
    await submitCreatorQuizForReviewServer(request, body.quizId);
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Could not submit this quiz for review.");
  }
}
