import "server-only";
import type { z } from "zod";
import { getReasoningConfig, type ReasoningConfig } from "./env";
import { ServiceError } from "./errors";
import { fetchWithRetry } from "./http";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ReasonInput {
  messages: ChatMessage[];
  /** Reasoning trace / effort. Off for conversational turns (latency), on for reviews. */
  thinking?: boolean;
  /** Constrains output to a JSON Schema (vLLM guided decoding, Gemini structured output). */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ReasonResult {
  content: string;
  reasoning: string | null;
  provider: ReasoningConfig["provider"];
  model: string;
  latencyMs: number;
}

const THINK_BLOCK = /<think>([\s\S]*?)<\/think>/i;

function buildBody(config: ReasoningConfig, input: ReasonInput): Record<string, unknown> {
  const { messages, thinking = false, jsonSchema, maxTokens = 1024, temperature } = input;
  const body: Record<string, unknown> = {
    model: thinking ? config.reviewModel : config.model,
    messages,
    max_tokens: maxTokens,
  };

  if (config.provider === "evon") {
    body.temperature = temperature ?? (thinking ? 0.6 : 0.2);
    body.top_p = 0.95;
    if (config.sendChatTemplateKwargs) body.chat_template_kwargs = { enable_thinking: thinking };
  } else {
    // Gemini 3 models are tuned for the default temperature; only override when asked.
    if (temperature !== undefined) body.temperature = temperature;
    body.reasoning_effort = thinking ? "high" : "low";
  }

  if (jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
    };
  }
  return body;
}

function post(config: ReasoningConfig, body: Record<string, unknown>, timeoutMs: number) {
  return fetchWithRetry(
    `${config.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    },
    { retries: 2, baseDelayMs: 1500, timeoutMs },
  );
}

export async function reason(input: ReasonInput): Promise<ReasonResult> {
  const config = getReasoningConfig();
  const body = buildBody(config, input);
  const timeoutMs = input.timeoutMs ?? 45_000;

  const started = performance.now();
  let res = await post(config, body, timeoutMs);

  // Gemini's free tier sheds load per model ("high demand"); the other configured model usually still answers.
  const fallbackModel = body.model === config.model ? config.reviewModel : config.model;
  if (res.status === 503 && fallbackModel !== body.model) {
    await res.body?.cancel();
    body.model = fallbackModel;
    res = await post(config, body, timeoutMs);
  }
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      config.provider,
      `${config.label} request failed with HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`,
      res.status === 429 ? 429 : 502,
      res.status === 429 ? "RATE_LIMITED" : undefined,
    );
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: {
      message?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null };
    }[];
  };
  const message = data.choices?.[0]?.message;
  let content = message?.content ?? "";
  let reasoning = message?.reasoning_content ?? message?.reasoning ?? null;

  // Some servers inline the trace instead of using a reasoning parser.
  const inline = content.match(THINK_BLOCK);
  if (inline) {
    reasoning = reasoning ?? inline[1].trim();
    content = content.replace(THINK_BLOCK, "");
  }

  return {
    content: content.trim(),
    reasoning,
    provider: config.provider,
    model: data.model ?? String(body.model),
    latencyMs,
  };
}

function parseJsonContent(content: string): unknown {
  const unfenced = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SyntaxError("No JSON object in model output");
  return JSON.parse(unfenced.slice(start, end + 1));
}

/**
 * Calls the model with a JSON Schema and validates the result with Zod.
 * One repair attempt is made when the output is not valid JSON for the schema.
 */
export async function reasonJson<T>(
  input: ReasonInput & { jsonSchema: NonNullable<ReasonInput["jsonSchema"]> },
  schema: z.ZodType<T>,
): Promise<{ data: T; meta: ReasonResult; attempts: number }> {
  let messages = input.messages;
  let lastError = "";
  let totalLatency = 0;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const meta = await reason({ ...input, messages });
    totalLatency += meta.latencyMs;
    try {
      const parsed = schema.safeParse(parseJsonContent(meta.content));
      if (parsed.success) return { data: parsed.data, meta: { ...meta, latencyMs: totalLatency }, attempts: attempt };
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    messages = [
      ...input.messages,
      { role: "assistant", content: meta.content },
      { role: "user", content: `That output was invalid (${lastError}). Reply again with only the JSON object.` },
    ];
  }

  const config = getReasoningConfig();
  throw new ServiceError(config.provider, `Model returned invalid JSON: ${lastError}`, 502, "INVALID_JSON");
}
