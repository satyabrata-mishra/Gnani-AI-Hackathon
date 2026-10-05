import "server-only";
import { fetchWithRetry, type RetryOptions } from "../http";

/** Gnani's edge answers bursts with a fast 403 as well as 429/503; a valid key succeeds on retry. */
export function gnaniFetch(url: string, init: RequestInit, options?: Omit<RetryOptions, "retryOn">) {
  return fetchWithRetry(url, init, { retryOn: [403, 429, 503], ...options });
}
