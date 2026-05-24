import { NextResponse } from "next/server";
import { apiError, requireServerUser } from "@/lib/server/trusted-utils";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSafeRoomQuestions } from "@/lib/server/trusted-attempts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const roomId = new URL(request.url).searchParams.get("roomId") ?? "";
    if (!roomId) throw new Error("roomId is required.");
    const playerSnapshot = await getAdminDb().collection("roomPlayers").doc(`${roomId}_${decoded.uid}`).get();
    if (!playerSnapshot.exists) throw new Error("Join this room before loading questions.");
    const questions = await getSafeRoomQuestions(roomId);
    return NextResponse.json({ questions });
  } catch (caught) {
    return apiError(caught, "Could not load room questions.");
  }
}
