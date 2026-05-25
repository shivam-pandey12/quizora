import { NextResponse } from "next/server";
import { lookupFlashQuizServer } from "@/lib/server/flash";
import { apiError, requireServerUser } from "@/lib/server/trusted-utils";

export async function GET(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const url = new URL(request.url);
    const flashCode = url.searchParams.get("flashCode") ?? "";
    const flashQuiz = await lookupFlashQuizServer(decoded, flashCode);
    return NextResponse.json({ flashQuiz });
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be loaded.", 400);
  }
}
