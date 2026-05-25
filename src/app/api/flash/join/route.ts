import { NextResponse } from "next/server";
import { joinFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashCode?: string }>(request);
    const result = await joinFlashQuizServer(decoded, body.flashCode ?? "");
    return NextResponse.json(result);
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be joined.", 400);
  }
}
