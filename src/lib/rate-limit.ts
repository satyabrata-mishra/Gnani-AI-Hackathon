// Per-visitor request limits for the public demo. Counters live in memory, so on
// serverless hosts each warm instance counts separately: this caps casual abuse of
// the API quotas, it is not a hard global guarantee.

export interface Bucket {
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;

export const BUCKETS = {
  /** Each start may generate a question bank (one model call per form and language). */
  session: { limit: 15, windowMs: 60 * MINUTE },
  draft: { limit: 10, windowMs: 60 * MINUTE },
  /** Turns, review and read-back. A 10-field form uses roughly 10–15. */
  reasoning: { limit: 90, windowMs: 10 * MINUTE },
  stt: { limit: 90, windowMs: 10 * MINUTE },
  tts: { limit: 150, windowMs: 10 * MINUTE },
} satisfies Record<string, Bucket>;

export type BucketName = keyof typeof BUCKETS;

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createLimiter(buckets: Record<string, Bucket>, maxKeys = 10_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function prune(now: number) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    for (const key of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(key);
    }
  }

  return function check(bucket: string, client: string, now = Date.now()): LimitResult {
    const { limit, windowMs } = buckets[bucket];
    const key = `${bucket}:${client}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size >= maxKeys) prune(now);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    if (entry.count >= limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
    entry.count++;
    return { ok: true };
  };
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

/** On in production unless RATE_LIMIT=off; RATE_LIMIT=on enables it in development. */
function enabled() {
  const flag = process.env.RATE_LIMIT;
  if (flag === "on") return true;
  if (flag === "off") return false;
  return process.env.NODE_ENV === "production";
}

const check = createLimiter(BUCKETS);

export function limitRequest(req: Request, bucket: BucketName): Response | null {
  if (!enabled()) return null;
  const result = check(bucket, clientKey(req));
  if (result.ok) return null;
  const minutes = Math.ceil(result.retryAfterSec / 60);
  return Response.json(
    {
      error: {
        service: "bolo",
        code: "RATE_LIMITED",
        message: `You've reached this demo's limit for now. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      },
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}
