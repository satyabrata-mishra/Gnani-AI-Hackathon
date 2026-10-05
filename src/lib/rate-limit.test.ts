import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { clientKey, createLimiter } from "./rate-limit.ts";

const buckets = { demo: { limit: 2, windowMs: 1000 } };

describe("createLimiter", () => {
  it("allows up to the limit, then reports when to retry", () => {
    const check = createLimiter(buckets);
    assert.deepEqual(check("demo", "a", 0), { ok: true });
    assert.deepEqual(check("demo", "a", 100), { ok: true });
    assert.deepEqual(check("demo", "a", 200), { ok: false, retryAfterSec: 1 });
  });

  it("counts each visitor separately and resets after the window", () => {
    const check = createLimiter(buckets);
    check("demo", "a", 0);
    check("demo", "a", 0);
    assert.equal(check("demo", "b", 0).ok, true);
    assert.equal(check("demo", "a", 1000).ok, true);
  });

  it("stays within its key budget", () => {
    const check = createLimiter(buckets, 3);
    for (const client of ["a", "b", "c", "d", "e"]) assert.equal(check("demo", client, 0).ok, true);
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    assert.equal(clientKey(req), "203.0.113.7");
  });

  it("falls back when no proxy headers are present", () => {
    assert.equal(clientKey(new Request("http://x")), "unknown");
  });
});
