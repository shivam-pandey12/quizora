import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/trusted-utils";
import { handleImageDelete } from "@/lib/server/image-uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await handleImageDelete(request);
    return NextResponse.json(payload);
  } catch (caught) {
    return apiError(caught, "Image delete failed.");
  }
}
