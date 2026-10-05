import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { synthesize } from "@/lib/gnani/tts";
import { getLanguage } from "@/lib/languages";
import { limitRequest } from "@/lib/rate-limit";

const Body = z.object({
  text: z.string().trim().min(1).max(600),
  languageId: z.string(),
});

export async function POST(req: Request) {
  const limited = limitRequest(req, "tts");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Expected { text, languageId }" } }, { status: 400 });
  }
  const language = getLanguage(parsed.data.languageId);
  if (!language) {
    return Response.json({ error: { message: "Unsupported language" } }, { status: 400 });
  }

  try {
    const result = await synthesize({
      text: parsed.data.text,
      language: language.tts,
      voice: language.voice,
    });
    return new Response(result.audio, {
      headers: {
        "Content-Type": result.contentType,
        "X-Latency-Ms": String(result.latencyMs),
        "X-Cache": result.cached ? "HIT" : "MISS",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
