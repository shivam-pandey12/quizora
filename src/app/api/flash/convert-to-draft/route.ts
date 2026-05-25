import { NextResponse } from "next/server";
import { convertFlashQuizToDraftServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string }>(request);
    const result = await convertFlashQuizToDraftServer(decoded, body.flashQuizId ?? "");
    return NextResponse.json(result);
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be converted.", 400);
  }
}
