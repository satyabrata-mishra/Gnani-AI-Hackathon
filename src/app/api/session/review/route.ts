import { z } from "zod";
import { reviewSession } from "@/lib/engine/review";
import { sessionStateSchema } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/errors";
import { formTemplateSchema } from "@/lib/forms/schema";
import { limitRequest } from "@/lib/rate-limit";

const Body = z.object({ state: sessionStateSchema, template: formTemplateSchema.optional() });

export async function POST(req: Request) {
  const limited = limitRequest(req, "reasoning");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { state, template? }" } }, { status: 400 });
  }

  try {
    return Response.json(await reviewSession(parsed.data.state, parsed.data.template));
  } catch (err) {
    return toErrorResponse(err);
  }
}
