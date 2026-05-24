import { NextResponse } from "next/server";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";
import { submitTrustedRoomAnswer } from "@/lib/server/trusted-rooms";
import type { QuizAnswerState } from "@/types/domain";

export const runtime = "nodejs";

interface SubmitRoomAnswerBody {
  roomId?: string;
  questionIndex?: number;
  answer?: QuizAnswerState;
  botUserId?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<SubmitRoomAnswerBody>(request);
    await submitTrustedRoomAnswer({
      decoded,
      roomId: body.roomId ?? "",
      questionIndex: typeof body.questionIndex === "number" ? body.questionIndex : -1,
      answer: body.answer,
      botUserId: body.botUserId
    });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Could not submit room answer.");
  }
}
