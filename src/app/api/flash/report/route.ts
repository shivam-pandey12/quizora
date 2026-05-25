import { NextResponse } from "next/server";
import { reportFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string; reason?: string; details?: string }>(request);
    await reportFlashQuizServer(decoded, body.flashQuizId ?? "", body.reason ?? "", body.details ?? "");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Flash Quiz report could not be submitted.", 400);
  }
}
