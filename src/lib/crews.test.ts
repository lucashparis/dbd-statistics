import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCrewReady, canWrite, resolveInvitees, getInvitesForUser } from "@/lib/crews";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn() },
    crewMember: { findMany: vi.fn() },
  },
}));

const accepted = (userId: string) => ({ userId, status: "accepted" as const });
const pending = (userId: string) => ({ userId, status: "pending" as const });

describe("isCrewReady", () => {
  it("is true only when every member accepted", () => {
    expect(isCrewReady([accepted("a"), accepted("b")])).toBe(true);
  });
  it("is false with a pending member", () => {
    expect(isCrewReady([accepted("a"), pending("b")])).toBe(false);
  });
  it("is false with a declined member", () => {
    expect(isCrewReady([accepted("a"), { userId: "b", status: "declined" }])).toBe(false);
  });
});

describe("canWrite", () => {
  const ready = [accepted("owner"), accepted("m2")];

  it("allMembers + ready + accepted member → true", () => {
    expect(canWrite(ready, "allMembers", "owner", "m2")).toBe(true);
  });
  it("allMembers + non-member → false", () => {
    expect(canWrite(ready, "allMembers", "owner", "stranger")).toBe(false);
  });
  it("not ready → false even for owner", () => {
    expect(canWrite([accepted("owner"), pending("m2")], "allMembers", "owner", "owner")).toBe(false);
  });
  it("hostOnly + owner → true", () => {
    expect(canWrite(ready, "hostOnly", "owner", "owner")).toBe(true);
  });
  it("hostOnly + non-owner member → false", () => {
    expect(canWrite(ready, "hostOnly", "owner", "m2")).toBe(false);
  });
  it("pending viewer → false", () => {
    expect(canWrite([accepted("owner"), pending("m2")], "allMembers", "owner", "m2")).toBe(false);
  });
});

describe("resolveInvitees", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes the owner and returns ids when all have public profiles", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([
      { userId: "a" },
      { userId: "b" },
    ] as never);
    const res = await resolveInvitees(["a", "b", "owner"], "owner");
    expect(res).toEqual({ ok: true, ids: ["a", "b"] });
  });

  it("fails when any invitee lacks a public profile", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValueOnce([{ userId: "a" }] as never);
    const res = await resolveInvitees(["a", "b"], "owner");
    expect(res).toEqual({ ok: false });
  });

  it("returns empty ids when only the owner was passed", async () => {
    const res = await resolveInvitees(["owner"], "owner");
    expect(res).toEqual({ ok: true, ids: [] });
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });
});

describe("getInvitesForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps pending invites to the wire shape", async () => {
    vi.mocked(prisma.crewMember.findMany).mockResolvedValueOnce([
      {
        id: 5,
        invitedAt: new Date("2024-01-01T00:00:00.000Z"),
        crew: { id: 2, name: "Alpha", owner: { name: "Léo", profile: { nick: "leo" } } },
      },
    ] as never);
    const invites = await getInvitesForUser("u2");
    expect(invites).toEqual([
      {
        id: 5,
        crew: { id: 2, name: "Alpha" },
        invitedBy: { name: "Léo", nick: "leo" },
        invitedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
  });
});
