import "server-only";

const RETRYABLE = [429, 503];

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  retryOn?: readonly number[];
}

/** Retries 429/503 (or `retryOn`) with backoff, honouring `retry-after` when present. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { retries = 2, baseDelayMs = 800, timeoutMs = 30_000, retryOn = RETRYABLE }: RetryOptions = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!retryOn.includes(res.status) || attempt >= retries) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * 2 ** attempt;
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, delay));
  }
}
