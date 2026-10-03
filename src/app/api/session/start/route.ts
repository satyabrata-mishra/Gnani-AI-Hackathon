import { z } from "zod";
import { beginSession } from "@/lib/engine/turn";
import { toErrorResponse } from "@/lib/errors";

const Body = z.object({
  templateId: z.string().min(1),
  languageId: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { templateId, languageId }" } }, { status: 400 });
  }

  try {
    return Response.json(await beginSession(parsed.data.templateId, parsed.data.languageId));
  } catch (err) {
    return toErrorResponse(err);
  }
}
