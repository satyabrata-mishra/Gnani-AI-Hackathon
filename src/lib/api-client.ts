import type { QuestionBank, ReviewResult, SessionState, SpokenPrompt, TurnResult } from "./engine/types";
import type { FormTemplate } from "./forms/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly service?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { message?: string; service?: string } };
    return new ApiError(body.error?.message ?? `Request failed (${res.status})`, res.status, body.error?.service);
  } catch {
    return new ApiError(`Request failed (${res.status})`, res.status);
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

// `template` is only sent for custom forms; built-in forms are resolved on the server.

export function startSession(templateId: string, languageId: string, template?: FormTemplate) {
  return postJson<{ state: SessionState; prompt: SpokenPrompt; bank: QuestionBank }>("/api/session/start", {
    templateId,
    languageId,
    template,
  });
}

export function sendTurn(state: SessionState, transcript: string, template?: FormTemplate) {
  return postJson<TurnResult>("/api/session/turn", { state, transcript, template });
}

export function requestReview(state: SessionState, template?: FormTemplate) {
  return postJson<ReviewResult>("/api/session/review", { state, template });
}

export function requestReadBack(state: SessionState, template?: FormTemplate) {
  return postJson<{ text: string; latencyMs: number }>("/api/session/readback", { state, template });
}

export function draftForm(description: string) {
  return postJson<{ template: FormTemplate; notes: string[]; latencyMs: number }>("/api/forms/draft", { description });
}

export interface TranscriptResponse {
  transcript: string;
  latencyMs: number;
}

export async function transcribeAudio(blob: Blob, languageId: string): Promise<TranscriptResponse> {
  const form = new FormData();
  form.append("audio", blob, "answer.wav");
  form.append("languageId", languageId);
  const res = await fetch("/api/stt", { method: "POST", body: form });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export interface SpeechResponse {
  audio: Blob;
  latencyMs: number;
  cached: boolean;
}

export async function fetchSpeech(text: string, languageId: string): Promise<SpeechResponse> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, languageId }),
  });
  if (!res.ok) throw await toApiError(res);
  return {
    audio: await res.blob(),
    latencyMs: Number(res.headers.get("X-Latency-Ms") ?? 0),
    cached: res.headers.get("X-Cache") === "HIT",
  };
}
