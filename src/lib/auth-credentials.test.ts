import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { verifyCredentials, hashPassword } from "@/lib/auth-credentials";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

function userRow(password: string) {
  return {
    id: "u1",
    email: "a@b.com",
    name: "A",
    password,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("hashPassword", () => {
  it("returns a bcrypt hash that verifies against the original", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", hash)).toBe(true);
  });
});

describe("verifyCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    expect(await verifyCredentials("nobody@x.com", "pw")).toBeNull();
  });

  it("returns null when the password does not match", async () => {
    const hash = await hashPassword("correct");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userRow(hash));
    expect(await verifyCredentials("a@b.com", "wrong")).toBeNull();
  });

  it("returns the user without the password hash when credentials are valid", async () => {
    const hash = await hashPassword("correct");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userRow(hash));
    const result = await verifyCredentials("a@b.com", "correct");
    expect(result).toEqual({ id: "u1", email: "a@b.com", name: "A" });
  });
});
