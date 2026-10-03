import "server-only";
import { getGnaniConfig } from "../env";
import { readGnaniError, ServiceError } from "../errors";
import { gnaniFetch } from "./http";
import type { SttLanguageCode } from "../languages";

export interface TranscribeInput {
  audio: Blob;
  filename: string;
  language: SttLanguageCode;
  /** `transcribe` enables inverse text normalization (digits, ₹, dates). */
  format?: "transcribe" | "verbatim";
}

export interface TranscribeResult {
  transcript: string;
  requestId: string | null;
  latencyMs: number;
}

/** Prisma v2.5 REST — clips up to 60 s (ideal ≤ 30 s). */
export async function transcribe({
  audio,
  filename,
  language,
  format = "transcribe",
}: TranscribeInput): Promise<TranscribeResult> {
  const { apiKey, baseUrl } = getGnaniConfig();

  const form = new FormData();
  form.append("audio_file", audio, filename);
  form.append("language_code", language);
  form.append("format", format);

  const started = performance.now();
  const res = await gnaniFetch(`${baseUrl}/stt/v3`, {
    method: "POST",
    headers: { "X-API-Key-ID": apiKey },
    body: form,
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) throw await readGnaniError("prisma", res);

  const body = (await res.json()) as {
    success?: boolean;
    transcript?: string;
    request_id?: string;
  };
  if (body.success === false || typeof body.transcript !== "string") {
    throw new ServiceError("prisma", "Prisma returned an unexpected response", 502);
  }

  return {
    transcript: body.transcript.trim(),
    requestId: body.request_id ?? null,
    latencyMs,
  };
}
