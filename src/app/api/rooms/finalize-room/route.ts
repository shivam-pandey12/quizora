import { NextResponse } from "next/server";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";
import { ensureTrustedRoomAttempt } from "@/lib/server/trusted-rooms";

export const runtime = "nodejs";

interface FinalizeRoomBody {
  roomId?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<FinalizeRoomBody>(request);
    const attemptId = await ensureTrustedRoomAttempt({ decoded, roomId: body.roomId ?? "" });
    return NextResponse.json({ attemptId });
  } catch (caught) {
    return apiError(caught, "Could not save this room attempt.");
  }
}
