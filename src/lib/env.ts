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

export function getEvonConfig() {
  const baseUrl = process.env.EVON_BASE_URL;
  if (!baseUrl) {
    throw new ServiceError("config", "EVON_BASE_URL is not set in .env.local", 503, "MISSING_ENV");
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey: process.env.EVON_API_KEY || undefined,
    model: process.env.EVON_MODEL || "model",
    sendChatTemplateKwargs: process.env.EVON_SEND_CHAT_TEMPLATE_KWARGS !== "false",
  };
}

export function getServiceStatus() {
  return {
    gnani: Boolean(process.env.GNANI_API_KEY),
    evon: Boolean(process.env.EVON_BASE_URL),
    evonModel: process.env.EVON_BASE_URL ? process.env.EVON_MODEL || "model" : null,
  };
}

export type ServiceStatus = ReturnType<typeof getServiceStatus>;
