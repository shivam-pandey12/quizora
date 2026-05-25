import { NextResponse } from "next/server";
import { reviewCreatorQuizServer } from "@/lib/server/creator-review";
import { apiError, readJsonBody } from "@/lib/server/trusted-utils";

export const runtime = "nodejs";

interface ReviewCreatorQuizBody {
  quizId?: string;
  action?: "approve" | "reject" | "archive";
  note?: string;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<ReviewCreatorQuizBody>(request);
    if (!body.quizId) throw new Error("Choose a creator quiz.");
    if (body.action !== "approve" && body.action !== "reject" && body.action !== "archive") {
      throw new Error("Choose a valid review action.");
    }
    await reviewCreatorQuizServer({
      request,
      quizId: body.quizId,
      action: body.action,
      note: body.note ?? ""
    });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Could not review this creator quiz.");
  }
}
