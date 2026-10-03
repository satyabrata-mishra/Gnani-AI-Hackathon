import "server-only";
import { getEvonConfig } from "./env";
import { ServiceError } from "./errors";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface EvonChatInput {
  messages: ChatMessage[];
  /** Evon's optional reasoning trace. Off for conversational turns (latency). */
  thinking?: boolean;
  /** Constrains output to a JSON Schema (vLLM guided decoding). */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface EvonChatResult {
  content: string;
  reasoning: string | null;
  model: string;
  latencyMs: number;
}

const THINK_BLOCK = /<think>([\s\S]*?)<\/think>/i;

export async function evonChat({
  messages,
  thinking = false,
  jsonSchema,
  maxTokens = 1024,
  temperature,
  timeoutMs = 45_000,
}: EvonChatInput): Promise<EvonChatResult> {
  const { baseUrl, apiKey, model, sendChatTemplateKwargs } = getEvonConfig();

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: temperature ?? (thinking ? 0.6 : 0.2),
    top_p: 0.95,
  };
  if (sendChatTemplateKwargs) body.chat_template_kwargs = { enable_thinking: thinking };
  if (jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
    };
  }

  const started = performance.now();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ServiceError(
      "evon",
      `Evon request failed with HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`,
      res.status === 429 ? 429 : 502,
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

  return { content: content.trim(), reasoning, model: data.model ?? model, latencyMs };
}
