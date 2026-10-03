import "server-only";
import { ServiceError } from "./errors";

export function getGnaniConfig() {
  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) {
    throw new ServiceError("config", "GNANI_API_KEY is not set in .env.local", 503, "MISSING_ENV");
  }
  return {
    apiKey,
    baseUrl: (process.env.GNANI_BASE_URL || "https://api.vachana.ai").replace(/\/$/, ""),
  };
}

export type ReasoningProvider = "evon" | "gemini";

export interface ReasoningConfig {
  provider: ReasoningProvider;
  label: string;
  baseUrl: string;
  apiKey?: string;
  /** Used for conversational turns (latency matters). */
  model: string;
  /** Used for the end-of-form review (accuracy matters). */
  reviewModel: string;
  sendChatTemplateKwargs: boolean;
}

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** Evon wins whenever it is configured; Gemini is the stand-in until then. */
function resolveProvider(): ReasoningProvider | null {
  const explicit = process.env.REASONING_PROVIDER;
  if (explicit === "evon" || explicit === "gemini") return explicit;
  if (process.env.EVON_BASE_URL) return "evon";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function getReasoningConfig(): ReasoningConfig {
  const provider = resolveProvider();

  if (provider === "evon") {
    const baseUrl = process.env.EVON_BASE_URL;
    if (!baseUrl) {
      throw new ServiceError("config", "EVON_BASE_URL is not set in .env.local", 503, "MISSING_ENV");
    }
    const model = process.env.EVON_MODEL || "model";
    return {
      provider,
      label: "Evon v3.3",
      baseUrl: baseUrl.replace(/\/$/, ""),
      apiKey: process.env.EVON_API_KEY || undefined,
      model,
      reviewModel: model,
      sendChatTemplateKwargs: process.env.EVON_SEND_CHAT_TEMPLATE_KWARGS !== "false",
    };
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceError("config", "GEMINI_API_KEY is not set in .env.local", 503, "MISSING_ENV");
    }
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    return {
      provider,
      label: "Gemini (Evon stand-in)",
      baseUrl: GEMINI_OPENAI_BASE_URL,
      apiKey,
      model,
      reviewModel: process.env.GEMINI_REVIEW_MODEL || "gemini-3.8-flash",
      sendChatTemplateKwargs: false,
    };
  }

  throw new ServiceError(
    "config",
    "No reasoning model configured. Set EVON_BASE_URL or GEMINI_API_KEY in .env.local",
    503,
    "MISSING_ENV",
  );
}

export function getServiceStatus() {
  let reasoning: { provider: ReasoningProvider; label: string; model: string } | null = null;
  try {
    const config = getReasoningConfig();
    reasoning = { provider: config.provider, label: config.label, model: config.model };
  } catch {
    reasoning = null;
  }
  return { gnani: Boolean(process.env.GNANI_API_KEY), reasoning };
}

export type ServiceStatus = ReturnType<typeof getServiceStatus>;
