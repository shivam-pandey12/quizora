import { NextResponse } from "next/server";
import { reviewCreatorRequestServer } from "@/lib/server/creator-review";
import { apiError, readJsonBody } from "@/lib/server/trusted-utils";

export const runtime = "nodejs";

interface ReviewCreatorRequestBody {
  requestId?: string;
  action?: "approve" | "reject";
  note?: string;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<ReviewCreatorRequestBody>(request);
    if (!body.requestId) throw new Error("Choose a creator request.");
    if (body.action !== "approve" && body.action !== "reject") {
      throw new Error("Choose approve or reject.");
    }
    await reviewCreatorRequestServer({
      request,
      requestId: body.requestId,
      action: body.action,
      note: body.note ?? ""
    });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return apiError(caught, "Could not review this creator request.");
  }
}
