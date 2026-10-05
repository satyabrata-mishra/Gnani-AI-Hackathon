import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { draftForm } from "@/lib/forms/draft";

const Body = z.object({ description: z.string().trim().min(10).max(1500) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "Describe the form in a sentence or two (10 to 1500 characters)." } },
      { status: 400 },
    );
  }

  try {
    return Response.json(await draftForm(parsed.data.description));
  } catch (err) {
    return toErrorResponse(err);
  }
}
