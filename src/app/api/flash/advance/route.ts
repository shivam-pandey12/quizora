import { NextResponse } from "next/server";
import { advanceFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string }>(request);
    const result = await advanceFlashQuizServer(decoded, body.flashQuizId ?? "");
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not advance.", 400);
  }
}
