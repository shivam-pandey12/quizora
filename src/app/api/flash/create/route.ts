import { NextResponse } from "next/server";
import { createFlashQuizServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<Record<string, unknown>>(request);
    const result = await createFlashQuizServer(decoded, body);
    return NextResponse.json(result);
  } catch (caught) {
    return apiError(caught, "Flash Quiz could not be created.", 400);
  }
}
