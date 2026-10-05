import { z } from "zod";
import { beginSession } from "@/lib/engine/turn";
import { toErrorResponse } from "@/lib/errors";
import { formTemplateSchema } from "@/lib/forms/schema";

const Body = z.object({
  templateId: z.string().min(1),
  languageId: z.string().min(1),
  template: formTemplateSchema.optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { templateId, languageId, template? }" } }, { status: 400 });
  }

  const { templateId, languageId, template } = parsed.data;
  try {
    return Response.json(await beginSession(templateId, languageId, template));
  } catch (err) {
    return toErrorResponse(err);
  }
}
