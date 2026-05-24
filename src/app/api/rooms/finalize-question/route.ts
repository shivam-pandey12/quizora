import { NextResponse } from "next/server";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";
import { finalizeTrustedRoomQuestion } from "@/lib/server/trusted-rooms";

export const runtime = "nodejs";

interface FinalizeQuestionBody {
  roomId?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<FinalizeQuestionBody>(request);
    const result = await finalizeTrustedRoomQuestion({ decoded, roomId: body.roomId ?? "" });
    return NextResponse.json({ ok: true, completed: result.completed });
  } catch (caught) {
    return apiError(caught, "Could not finalize room question.");
  }
}
