import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/signup/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

function req(body: unknown) {
  return new Request("http://localhost/api/signup", {
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
    preferredMode: "survivor" as const,
    preferredSeason: "current",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on invalid input", async () => {
    const res = await POST(req({ email: "not-an-email", password: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userRow());
    const res = await POST(req({ email: "a@b.com", password: "secret" }));
    expect(res.status).toBe(409);
  });

  it("returns 201 and stores a hashed (not plaintext) password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce(userRow({ id: "u2", email: "new@b.com" }));

    const res = await POST(req({ email: "new@b.com", password: "secret" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "u2", email: "new@b.com" });

    const createArg = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createArg.data.password).not.toBe("secret");
    expect(createArg.data.password.length).toBeGreaterThan(20);
  });
});


