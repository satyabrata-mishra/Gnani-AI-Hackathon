export type ServiceName = "prisma" | "timbre" | "evon" | "gemini" | "config";

export class ServiceError extends Error {
  constructor(
    public readonly service: ServiceName,
    message: string,
    public readonly status = 502,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * Gnani error bodies come in several shapes in practice:
 * `{ error: { type, message } }`, `{ message, status_code }`,
 * and `{ detail: { error_code, message } }`.
 */
export async function readGnaniError(
  service: ServiceName,
  res: Response,
): Promise<ServiceError> {
  let code: string | undefined;
  let message = `${service} request failed with HTTP ${res.status}`;
  try {
    const body = (await res.json()) as {
      error?: { type?: string; message?: string };
      message?: string;
      detail?: string | { error_code?: string; message?: string };
    };
    const detail = typeof body.detail === "object" ? body.detail : undefined;
    code = body.error?.type ?? detail?.error_code;
    message =
      body.error?.message ??
      detail?.message ??
      body.message ??
      (typeof body.detail === "string" ? body.detail : message);
  } catch {
    // Non-JSON error body; keep the generic message.
  }
  const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : res.status;
  return new ServiceError(service, message, status, code);
}

const BUSY_MESSAGE = "Bolo's speech and AI services are busy right now. Please wait a minute and try again.";

/** Shown to citizens instead of raw upstream errors, which stay in the server log. */
const UPSTREAM_MESSAGES: Record<Exclude<ServiceName, "config">, string> = {
  prisma: "Bolo couldn't reach its speech recognition service. Please try again.",
  timbre: "Bolo couldn't reach its voice service. Please try again.",
  gemini: "Bolo's AI service didn't respond properly. Please try again.",
  evon: "Bolo's AI service didn't respond properly. Please try again.",
};
const INVALID_DRAFT_MESSAGE = "Bolo couldn't draft a usable form from that. Please try again, or add a little more detail.";
const TIMEOUT_MESSAGE = "Bolo's services took too long to respond. Please try again.";
const UNREACHABLE_MESSAGE = "Bolo couldn't reach its speech and AI services. Please try again in a moment.";

function errorJson(service: string, code: string | undefined, message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: { service, code, message } }, { status, headers });
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof ServiceError && err.status === 429) {
    console.warn(`[${err.service}] rate limited: ${err.message}`);
    return errorJson(err.service, "UPSTREAM_BUSY", BUSY_MESSAGE, 429, { "Retry-After": "60" });
  }
  if (err instanceof ServiceError) {
    // Config errors are for the developer or a malformed request, so their text is kept.
    if (err.service === "config") return errorJson(err.service, err.code, err.message, err.status);
    console.warn(`[${err.service}] ${err.code ?? "error"}: ${err.message}`);
    const message = err.code === "INVALID_DRAFT" ? INVALID_DRAFT_MESSAGE : UPSTREAM_MESSAGES[err.service];
    return errorJson(err.service, err.code, message, err.status);
  }
  if (err instanceof Error && err.name === "TimeoutError") {
    console.warn(`[upstream] timeout: ${err.message}`);
    return errorJson("unknown", "TIMEOUT", TIMEOUT_MESSAGE, 504);
  }
  // undici reports DNS, connect and TLS failures as a bare `TypeError: fetch failed`.
  if (err instanceof TypeError && err.message === "fetch failed") {
    console.warn(`[upstream] unreachable: ${String(err.cause ?? err.message)}`);
    return errorJson("unknown", "UNREACHABLE", UNREACHABLE_MESSAGE, 502);
  }
  console.error(err);
  return errorJson("unknown", "INTERNAL", "Something went wrong on Bolo's side. Please try again.", 500);
}
