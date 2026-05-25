import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/trusted-utils";
import { handleImageUpload } from "@/lib/server/image-uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await handleImageUpload(request, "question-image");
    return NextResponse.json(payload);
  } catch (caught) {
    return apiError(caught, "Question image upload failed.");
  }
}
