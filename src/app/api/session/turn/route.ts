import { z } from "zod";
import { runTurn } from "@/lib/engine/turn";
import { sessionStateSchema } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/errors";
import { formTemplateSchema } from "@/lib/forms/schema";

const Body = z.object({
  state: sessionStateSchema,
  transcript: z.string().max(2000),
  template: formTemplateSchema.optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { state, transcript, template? }" } }, { status: 400 });
  }

  const { state, transcript, template } = parsed.data;
  try {
    return Response.json(await runTurn(state, transcript, template));
  } catch (err) {
    return toErrorResponse(err);
  }
}
