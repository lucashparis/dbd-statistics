import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

function req(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function userRow(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: "u1",
    email: "a@b.com",
    name: null,
    password: "hashed",
    passwordChangedAt: null,
    preferredMode: "survivor" as const,
    preferredSeason: "current",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "https://app.example.com";
  });

  it("returns 400 on invalid input", async () => {
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with a generic message and never sends an email when the user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const res = await POST(req({ email: "nobody@b.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If that email is registered, a reset link was sent.",
    });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a token, invalidates prior tokens, and sends the email when the user exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userRow());
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([]);

    const res = await POST(req({ email: "a@b.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If that email is registered, a reset link was sent.",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [to, resetUrl] = vi.mocked(sendPasswordResetEmail).mock.calls[0];
    expect(to).toBe("a@b.com");
    expect(resetUrl).toMatch(/^https:\/\/app\.example\.com\/reset-password\?token=[a-f0-9]{64}$/);
  });

  it("returns the same 200 body for an existing and a non-existing email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    const resMissing = await POST(req({ email: "nobody@b.com" }));

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userRow());
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([]);
    const resFound = await POST(req({ email: "a@b.com" }));

    expect(resMissing.status).toBe(resFound.status);
    expect(await resMissing.json()).toEqual(await resFound.json());
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(500);
  });
});
