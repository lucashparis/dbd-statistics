import { describe, it, expect, vi, beforeEach } from "vitest";
import { blockIfBanned, bannedResponse, getBan, isBanned, listBans } from "@/lib/ban";
import { BAN_CODE, BAN_DESCRIPTION, BAN_TITLE } from "@/lib/ban-message";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { ban: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() } },
}));

const row = {
  id: "b1",
  reason: "Fake matches",
  createdAt: new Date("2026-08-09T12:00:00.000Z"),
  liftedAt: null,
  user: { id: "u9", name: "Meno", profile: { nick: "menob7" } },
  bannedBy: { name: "Lucas", profile: { nick: "paris" } },
};

describe("isBanned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is true while an unlifted ban exists", async () => {
    vi.mocked(prisma.ban.findFirst).mockResolvedValueOnce({ id: "b1" } as never);
    expect(await isBanned("u9")).toBe(true);
    expect(vi.mocked(prisma.ban.findFirst).mock.calls[0][0]).toMatchObject({
      where: { userId: "u9", liftedAt: null },
    });
  });

  it("is false when every ban was lifted", async () => {
    vi.mocked(prisma.ban.findFirst).mockResolvedValueOnce(null as never);
    expect(await isBanned("u9")).toBe(false);
  });
});

describe("blockIfBanned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the 403 payload for a banned user", async () => {
    vi.mocked(prisma.ban.findFirst).mockResolvedValueOnce({ id: "b1" } as never);
    const res = await blockIfBanned("u9");
    expect(res?.status).toBe(403);
    expect(await res!.json()).toEqual({
      code: BAN_CODE,
      error: BAN_TITLE,
      description: BAN_DESCRIPTION,
    });
  });

  it("returns null so the route continues for a clean user", async () => {
    vi.mocked(prisma.ban.findFirst).mockResolvedValueOnce(null as never);
    expect(await blockIfBanned("u1")).toBeNull();
  });
});

describe("bannedResponse", () => {
  it("carries the machine-readable code the client keys off", async () => {
    const res = bannedResponse();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(BAN_CODE);
  });
});

describe("listBans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serializes rows without ever selecting email or password", async () => {
    vi.mocked(prisma.ban.findMany).mockResolvedValueOnce([row] as never);
    const [view] = await listBans();
    expect(view).toEqual({
      id: "b1",
      userId: "u9",
      name: "Meno",
      nick: "menob7",
      reason: "Fake matches",
      createdAt: "2026-08-09T12:00:00.000Z",
      liftedAt: null,
      bannedBy: "paris",
    });
    const select = vi.mocked(prisma.ban.findMany).mock.calls[0][0]?.select as Record<string, unknown>;
    expect(JSON.stringify(select)).not.toContain("email");
    expect(JSON.stringify(select)).not.toContain("password");
  });

  it("falls back to the display name when the issuer has no nick", async () => {
    vi.mocked(prisma.ban.findMany).mockResolvedValueOnce([
      { ...row, bannedBy: { name: "Lucas", profile: null } },
    ] as never);
    expect((await listBans())[0].bannedBy).toBe("Lucas");
  });
});

describe("getBan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the ban does not exist", async () => {
    vi.mocked(prisma.ban.findUnique).mockResolvedValueOnce(null as never);
    expect(await getBan("nope")).toBeNull();
  });

  it("serializes the lifted timestamp", async () => {
    vi.mocked(prisma.ban.findUnique).mockResolvedValueOnce({
      ...row,
      liftedAt: new Date("2026-08-10T00:00:00.000Z"),
    } as never);
    expect((await getBan("b1"))?.liftedAt).toBe("2026-08-10T00:00:00.000Z");
  });
});
