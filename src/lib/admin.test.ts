import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAdmin, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/auth-helpers", () => ({ getSessionUserId: vi.fn() }));

describe("isAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is true only for a flagged account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: true } as never);
    expect(await isAdmin("u1")).toBe(true);
  });

  it("is false for a regular account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: false } as never);
    expect(await isAdmin("u1")).toBe(false);
  });

  it("is false when the user is gone", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
    expect(await isAdmin("ghost")).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s an anonymous caller", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce(null);
    const guard = await requireAdmin();
    expect(guard.response?.status).toBe(401);
  });

  it("404s a signed-in non-admin so the surface stays undiscoverable", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce("u2");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: false } as never);
    const guard = await requireAdmin();
    expect(guard.response?.status).toBe(404);
  });

  it("passes the admin's id through", async () => {
    vi.mocked(getSessionUserId).mockResolvedValueOnce("u1");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: true } as never);
    const guard = await requireAdmin();
    expect(guard.response).toBeUndefined();
    expect(guard.userId).toBe("u1");
  });
});
