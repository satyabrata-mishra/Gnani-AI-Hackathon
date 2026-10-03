import "server-only";
import { fetchWithRetry } from "../http";

/** Gnani rate-limits bursts aggressively; retry 429/503 with short backoff. */
export function gnaniFetch(url: string, init: RequestInit, options?: { retries?: number; baseDelayMs?: number }) {
  return fetchWithRetry(url, init, options);
}
