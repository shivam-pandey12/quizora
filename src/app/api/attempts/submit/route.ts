import { NextResponse } from "next/server";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";
import { submitTrustedAttempt } from "@/lib/server/trusted-attempts";
import type { QuizAnswerState } from "@/types/domain";

export const runtime = "nodejs";

interface SubmitAttemptBody {
  attemptSessionId?: string;
  sessionToken?: string;
  answers?: Record<string, QuizAnswerState>;
  clientStartedAtMs?: number;
  clientCompletedAtMs?: number;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<SubmitAttemptBody>(request);
    const result = await submitTrustedAttempt({
      decoded,
      attemptSessionId: body.attemptSessionId ?? "",
      sessionToken: body.sessionToken ?? "",
      answers: body.answers ?? {},
      clientStartedAtMs: body.clientStartedAtMs,
      clientCompletedAtMs: body.clientCompletedAtMs
    });
    return NextResponse.json(result);
  } catch (caught) {
    return apiError(caught, "Could not submit this trusted attempt.");
  }
}
