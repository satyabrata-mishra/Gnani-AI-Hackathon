export type ServiceName = "prisma" | "timbre" | "evon" | "config";

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

export function toErrorResponse(err: unknown): Response {
  if (err instanceof ServiceError) {
    return Response.json(
      { error: { service: err.service, code: err.code, message: err.message } },
      { status: err.status },
    );
  }
  if (err instanceof Error && err.name === "TimeoutError") {
    return Response.json(
      { error: { service: "unknown", code: "TIMEOUT", message: "Upstream request timed out" } },
      { status: 504 },
    );
  }
  console.error(err);
  return Response.json(
    { error: { service: "unknown", code: "INTERNAL", message: "Unexpected server error" } },
    { status: 500 },
  );
}
