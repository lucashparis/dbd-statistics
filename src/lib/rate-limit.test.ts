import { describe, it, expect } from "vitest";
import {
  rateLimitResponse,
  enforceRateLimit,
  rateLimitEnabled,
} from "./rate-limit";

describe("rateLimitResponse", () => {
  it("allows the request (null) when under the limit", () => {
    const res = rateLimitResponse(
      { success: true, limit: 20, remaining: 19, reset: 0 },
      0
    );
    expect(res).toBeNull();
  });

  it("returns 429 with rate-limit headers when over the limit", () => {
    const now = 1000;
    const res = rateLimitResponse(
      { success: false, limit: 20, remaining: 0, reset: now + 4500 },
      now
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBe("5");
    expect(res!.headers.get("X-RateLimit-Limit")).toBe("20");
    expect(res!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("never emits a negative Retry-After", () => {
    const res = rateLimitResponse(
      { success: false, limit: 20, remaining: 0, reset: 0 },
      5000
    );
    expect(res!.headers.get("Retry-After")).toBe("0");
  });
});

describe("enforceRateLimit (fail-open when unconfigured)", () => {
  it("is disabled without Upstash env", () => {
    expect(rateLimitEnabled()).toBe(false);
  });

  it("passes requests through when disabled", async () => {
    await expect(enforceRateLimit("user:123")).resolves.toBeNull();
  });
});
