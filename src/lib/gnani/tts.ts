import "server-only";
import { createHash } from "node:crypto";
import { getGnaniConfig } from "../env";
import { readGnaniError } from "../errors";
import { gnaniFetch } from "./http";
import type { TtsLanguageCode } from "../languages";

export interface SynthesizeInput {
  text: string;
  language: TtsLanguageCode;
  voice: string;
  speed?: number;
}

export interface SynthesizeResult {
  audio: ArrayBuffer;
  contentType: string;
  latencyMs: number;
  cached: boolean;
}

// Timbre returns HTTP 500 when mp3 is combined with bitrate/sample_rate fields.
const AUDIO_CONFIG = { container: "mp3" } as const;

// Repeated prompts (greetings, read-backs) should not spend credits twice.
const CACHE_LIMIT = 200;
const cache = new Map<string, ArrayBuffer>();

function cacheKey({ text, language, voice, speed = 1 }: SynthesizeInput) {
  return createHash("sha1").update(`${language}|${voice}|${speed}|${text}`).digest("hex");
}

/** Timbre v2.5 REST — returns the full clip in one response. */
export async function synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
  const key = cacheKey(input);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return { audio: hit, contentType: "audio/mpeg", latencyMs: 0, cached: true };
  }

  const { apiKey, baseUrl } = getGnaniConfig();
  const started = performance.now();
  const res = await gnaniFetch(`${baseUrl}/api/v1/tts/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": apiKey },
    body: JSON.stringify({
      text: input.text,
      voice: input.voice,
      model: "timbre-v2.5",
      language: input.language,
      speed: input.speed ?? 1,
      audio_config: AUDIO_CONFIG,
    }),
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) throw await readGnaniError("timbre", res);

  const audio = await res.arrayBuffer();
  cache.set(key, audio);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  return {
    audio,
    contentType: res.headers.get("content-type") ?? "audio/mpeg",
    latencyMs,
    cached: false,
  };
}
