import { describe, it, expect } from "vitest";
import { generateResetToken, hashToken, TOKEN_TTL_MS } from "@/lib/password-reset";

describe("generateResetToken", () => {
  it("produces a unique raw token on each call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.raw).not.toBe(b.raw);
  });

  it("derives hash from raw via the same function as hashToken", () => {
    const { raw, hash } = generateResetToken();
    expect(hashToken(raw)).toBe(hash);
  });

  it("sets expiresAt to TOKEN_TTL_MS in the future", () => {
    const before = Date.now();
    const { expiresAt } = generateResetToken();
    const after = Date.now();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + TOKEN_TTL_MS);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + TOKEN_TTL_MS);
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
