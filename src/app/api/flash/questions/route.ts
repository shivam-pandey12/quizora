import { NextResponse } from "next/server";
import { getSafeFlashQuestionsServer } from "@/lib/server/flash";
import { apiError, requireServerUser } from "@/lib/server/trusted-utils";

export async function GET(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const url = new URL(request.url);
    const flashQuizId = url.searchParams.get("flashQuizId") ?? "";
    const questions = await getSafeFlashQuestionsServer(decoded, flashQuizId);
    return NextResponse.json({ questions });
  } catch (caught) {
    return apiError(caught, "Flash questions could not be loaded.", 400);
  }
}
