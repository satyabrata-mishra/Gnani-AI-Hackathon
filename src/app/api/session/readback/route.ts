import { z } from "zod";
import { readBack } from "@/lib/engine/readback";
import { sessionStateSchema } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/errors";

const Body = z.object({ state: sessionStateSchema });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { state }" } }, { status: 400 });
  }

  try {
    return Response.json(await readBack(parsed.data.state));
  } catch (err) {
    return toErrorResponse(err);
  }
}
