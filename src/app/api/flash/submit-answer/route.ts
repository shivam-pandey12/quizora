import { NextResponse } from "next/server";
import { submitFlashAnswerServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";
import type { QuizAnswerState } from "@/types/domain";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{
      flashQuizId?: string;
      questionIndex?: number;
      answer?: QuizAnswerState;
    }>(request);
    if (!body.answer) throw new Error("Answer payload is required.");
    const result = await submitFlashAnswerServer({
      decoded,
      flashQuizId: body.flashQuizId ?? "",
      questionIndex: Number(body.questionIndex ?? 0),
      answer: {
        selectedAnswer: body.answer.selectedAnswer ?? "",
        selectedAnswers: Array.isArray(body.answer.selectedAnswers) ? body.answer.selectedAnswers : [],
        textAnswer: body.answer.textAnswer ?? "",
        timeSpentSeconds: Number(body.answer.timeSpentSeconds ?? 0)
      }
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    return apiError(caught, "Flash answer could not be submitted.", 400);
  }
}
