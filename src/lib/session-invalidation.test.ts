import { describe, it, expect } from "vitest";
import { isTokenStale } from "@/lib/session-invalidation";

describe("isTokenStale", () => {
  it("is false when passwordChangedAt is null", () => {
    expect(isTokenStale(1_000, null)).toBe(false);
  });

  it("is false when passwordChangedAt is undefined", () => {
    expect(isTokenStale(1_000, undefined)).toBe(false);
  });

  it("is false when tokenIat is undefined", () => {
    expect(isTokenStale(undefined, new Date())).toBe(false);
  });

  it("is false when passwordChangedAt is before the token was issued", () => {
    const iat = 1_000_000; // seconds
    const changedAt = new Date((iat - 60) * 1000); // 60s earlier
    expect(isTokenStale(iat, changedAt)).toBe(false);
  });

  it("is true when passwordChangedAt is after the token was issued", () => {
    const iat = 1_000_000; // seconds
    const changedAt = new Date((iat + 60) * 1000); // 60s later
    expect(isTokenStale(iat, changedAt)).toBe(true);
  });
});
