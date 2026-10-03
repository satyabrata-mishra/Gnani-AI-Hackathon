import { toErrorResponse } from "@/lib/errors";
import { transcribe } from "@/lib/gnani/stt";
import { getLanguage } from "@/lib/languages";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const languageId = form?.get("languageId");

  if (!(audio instanceof Blob) || typeof languageId !== "string") {
    return Response.json({ error: { message: "Expected multipart fields: audio, languageId" } }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: { message: "Audio must be between 1 byte and 5 MB" } }, { status: 413 });
  }
  const language = getLanguage(languageId);
  if (!language) {
    return Response.json({ error: { message: "Unsupported language" } }, { status: 400 });
  }

  try {
    const filename = audio instanceof File && audio.name ? audio.name : "answer.wav";
    const result = await transcribe({ audio, filename, language: language.stt });
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
