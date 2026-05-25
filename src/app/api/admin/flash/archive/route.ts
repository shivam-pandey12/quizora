import { NextResponse } from "next/server";
import { archiveFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerAdmin } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    await requireServerAdmin(request);
    const body = await readJsonBody<{ flashQuizId?: string }>(request);
    await archiveFlashQuizServer(body.flashQuizId ?? "");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be archived.", 400);
  }
}
