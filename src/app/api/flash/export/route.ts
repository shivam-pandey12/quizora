import { exportFlashResultsServer } from "@/lib/server/flash";
import { apiError, readJsonBody, requireServerUser } from "@/lib/server/trusted-utils";

export async function POST(request: Request) {
  try {
    const decoded = await requireServerUser(request);
    const body = await readJsonBody<{ flashQuizId?: string }>(request);
    const csv = await exportFlashResultsServer(decoded, body.flashQuizId ?? "");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=quizora-flash-results.csv"
      }
    });
  } catch (caught) {
    return apiError(caught, "Flash results could not be exported.", 400);
  }
}
