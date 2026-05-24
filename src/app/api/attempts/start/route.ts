import { NextResponse } from "next/server";
import { readJsonBody, requireServerUser, apiError } from "@/lib/server/trusted-utils";
import { startTrustedAttempt } from "@/lib/server/trusted-attempts";

export const runtime = "nodejs";

interface StartAttemptBody {
  quizId?: string;
  assignmentId?: string;
  classId?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<StartAttemptBody>(request);
    const payload = await startTrustedAttempt({
      decoded,
      quizId: body.quizId ?? "",
      assignmentId: body.assignmentId,
      classId: body.classId,
      request
    });
    return NextResponse.json(payload);
  } catch (caught) {
    return apiError(caught, "Could not start this trusted attempt.");
  }
}
