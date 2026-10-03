import { z } from "zod";
import { runTurn } from "@/lib/engine/turn";
import { sessionStateSchema } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/errors";

const Body = z.object({
  state: sessionStateSchema,
  transcript: z.string().max(2000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { state, transcript }" } }, { status: 400 });
  }

  try {
    return Response.json(await runTurn(parsed.data.state, parsed.data.transcript));
  } catch (err) {
    return toErrorResponse(err);
  }
}
