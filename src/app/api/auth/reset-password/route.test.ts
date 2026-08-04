import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/reset-password/route";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-reset";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: { findUnique: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

function req(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function tokenRow(overrides: Partial<{
  id: string;
  userId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
}> = {}) {
  return {
    id: "t1",
    userId: "u1",
    tokenHash: hashToken("raw-token"),
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on invalid input", async () => {
    const res = await POST(req({ token: "", password: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 with a generic message when the token does not exist", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValueOnce(null);
    const res = await POST(req({ token: "nope", password: "newpass" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });

  it("returns the same generic error when the token was already used", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValueOnce(
      tokenRow({ usedAt: new Date() })
    );
    const res = await POST(req({ token: "raw-token", password: "newpass" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });

  it("returns the same generic error when the token is expired", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValueOnce(
      tokenRow({ expiresAt: new Date(Date.now() - 1000) })
    );
    const res = await POST(req({ token: "raw-token", password: "newpass" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });

  it("updates the password (hashed), marks the token used, and returns the account email on success", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValueOnce(tokenRow());
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([
      { id: "u1", email: "a@b.com" },
      { id: "t1" },
    ]);

    const res = await POST(req({ token: "raw-token", password: "newsecret" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, email: "a@b.com" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ token: "raw-token", password: "newsecret" }));
    expect(res.status).toBe(500);
  });
});
