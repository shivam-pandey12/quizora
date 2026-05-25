import { NextResponse } from "next/server";
import { startFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string }>(request);
    await startFlashQuizServer(decoded, body.flashQuizId ?? "");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be started.", 400);
  }
}
