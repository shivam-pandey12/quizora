import { NextResponse } from "next/server";
import { extendFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string; expiryHours?: number }>(request);
    const expiresAt = await extendFlashQuizServer(decoded, body.flashQuizId ?? "", Number(body.expiryHours ?? 24));
    return NextResponse.json({ ok: true, expiresAt });
  } catch (caught) {
    return apiError(caught, "Flash Quiz expiry could not be extended.", 400);
  }
}
