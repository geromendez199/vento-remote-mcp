import { describe, it, expect } from "vitest";
import { RateLimiter } from "../src/rateLimit.js";

describe("RateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 5, burstPerSecond: 5 });
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("client", now + i * 250).allowed).toBe(true);
    }
  });

  it("blocks after minute limit is reached", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 3, burstPerSecond: 100 });
    const now = 1_000_000;
    // Spread over multiple seconds so burst limit does not interfere
    expect(limiter.check("client", now).allowed).toBe(true);
    expect(limiter.check("client", now + 2000).allowed).toBe(true);
    expect(limiter.check("client", now + 4000).allowed).toBe(true);
    const decision = limiter.check("client", now + 6000);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("minute_limit");
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the minute window rolls over", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1, burstPerSecond: 10 });
    const now = 1_000_000;
    expect(limiter.check("client", now).allowed).toBe(true);
    expect(limiter.check("client", now + 1000).allowed).toBe(false);
    expect(limiter.check("client", now + 61_000).allowed).toBe(true);
  });

  it("enforces burst limit within a second", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1000, burstPerSecond: 2 });
    const now = 1_000_000;
    expect(limiter.check("client", now).allowed).toBe(true);
    expect(limiter.check("client", now + 100).allowed).toBe(true);
    const decision = limiter.check("client", now + 200);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("burst_limit");
    // Next second the burst window resets
    expect(limiter.check("client", now + 1100).allowed).toBe(true);
  });

  it("tracks clients independently", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1, burstPerSecond: 10 });
    const now = 1_000_000;
    expect(limiter.check("a", now).allowed).toBe(true);
    expect(limiter.check("a", now + 500).allowed).toBe(false);
    expect(limiter.check("b", now + 500).allowed).toBe(true);
  });

  it("prunes idle clients", () => {
    const limiter = new RateLimiter({ requestsPerMinute: 10, burstPerSecond: 10 });
    const now = 1_000_000;
    limiter.check("a", now);
    limiter.check("b", now);
    expect(limiter.clientCount).toBe(2);
    limiter.prune(now + 200_000);
    expect(limiter.clientCount).toBe(0);
  });
});
