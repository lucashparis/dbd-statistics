import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isCrewReady,
  canWrite,
  resolveInvitees,
  getInvitesForUser,
  getCrewDetail,
} from "@/lib/crews";
import { prisma } from "@/lib/prisma";
import { seasonWhere } from "@/lib/seasons";
import type { MatchResult } from "@/types/killer";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn() },
    crewMember: { findMany: vi.fn() },
    crew: { findUnique: vi.fn() },
  },
}));

const accepted = (userId: string) => ({ userId, status: "accepted" as const });
const pending = (userId: string) => ({ userId, status: "pending" as const });
const declined = (userId: string) => ({ userId, status: "declined" as const });

describe("isCrewReady", () => {
  it("is true only when every member accepted", () => {
    expect(isCrewReady([accepted("a"), accepted("b")])).toBe(true);
  });
  it("is false with a pending member", () => {
    expect(isCrewReady([accepted("a"), pending("b")])).toBe(false);
  });
  it("is false with a declined member", () => {
    expect(isCrewReady([accepted("a"), declined("b")])).toBe(false);
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
  it("banned member → false even though they stay in the crew", () => {
    expect(canWrite(ready, "allMembers", "owner", "m2", true)).toBe(false);
  });
  it("banned owner → false, so a banned host cannot log for their own crew", () => {
    expect(canWrite(ready, "hostOnly", "owner", "owner", true)).toBe(false);
  });
});

describe("getCrewDetail season scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  // Prisma hands the timeline back newest-first, so chronological order is
  // win, win, loss, win → best run of 2, active run of 1.
  const NEWEST_FIRST = [
    { id: 4, result: "win", createdAt: new Date("2026-08-04T12:00:00Z") },
    { id: 3, result: "loss", createdAt: new Date("2026-08-03T12:00:00Z") },
    { id: 2, result: "win", createdAt: new Date("2026-08-02T12:00:00Z") },
    { id: 1, result: "win", createdAt: new Date("2026-08-01T12:00:00Z") },
  ] as { id: number; result: MatchResult; createdAt: Date }[];

  function seedCrew(
    matches: { id: number; result: MatchResult; createdAt: Date }[],
    persistedRuns: { winCount: number; status: "active" | "ended" }[]
  ) {
    vi.mocked(prisma.crew.findUnique).mockResolvedValueOnce({
      id: 1,
      name: "Alpha",
      writePolicy: "allMembers",
      ownerId: "owner",
      members: [
        {
          userId: "owner",
          status: "accepted",
          isOwner: true,
          user: { name: "Owner", profile: null },
        },
      ],
      streaks: persistedRuns,
      matches: matches.map((m) => ({
        ...m,
        killer: { id: 9, name: "Nurse", imageUrl: "" },
        loggedBy: { id: "owner", name: "Owner", profile: null },
      })),
    } as never);
  }

  it("rebuilds the streak chronologically, not in the order Prisma returned", async () => {
    seedCrew(NEWEST_FIRST, []);
    const crew = await getCrewDetail("owner", 1, 1);
    // Reading the list newest-first would yield bestStreak 1 and currentStreak 0.
    expect(crew?.bestStreak).toBe(2);
    expect(crew?.currentStreak).toBe(1);
  });

  it("keeps the persisted run counters for the all-time view", async () => {
    seedCrew(NEWEST_FIRST, [
      { winCount: 7, status: "ended" },
      { winCount: 3, status: "active" },
    ]);
    const crew = await getCrewDetail("owner", 1, "all");
    expect(crew?.bestStreak).toBe(7);
    expect(crew?.currentStreak).toBe(3);
  });

  it("counts a run that opened before the rollover only partially", async () => {
    // Inside the window only two of the run's wins are visible.
    seedCrew(
      [
        { id: 6, result: "win", createdAt: new Date("2026-07-20T12:00:00Z") },
        { id: 5, result: "win", createdAt: new Date("2026-07-16T12:00:00Z") },
      ] as { id: number; result: MatchResult; createdAt: Date }[],
      [{ winCount: 9, status: "active" }]
    );
    const crew = await getCrewDetail("owner", 1, 1);
    expect(crew?.currentStreak).toBe(2);
  });

  it("passes the season window to the match include and leaves members untouched", async () => {
    seedCrew(NEWEST_FIRST, []);
    await getCrewDetail("owner", 1, 0);
    const include = vi.mocked(prisma.crew.findUnique).mock.calls[0][0].include as {
      matches: { where: unknown };
      members: unknown;
    };
    expect(include.matches.where).toEqual(seasonWhere(0));
    expect(include.members).not.toHaveProperty("where");
  });

  it("returns a zeroed crew when the window holds no matches", async () => {
    seedCrew([], [{ winCount: 5, status: "active" }]);
    const crew = await getCrewDetail("owner", 1, 1);
    expect(crew).toMatchObject({
      currentStreak: 0,
      bestStreak: 0,
      totalMatches: 0,
      winRate: 0,
      canWrite: true,
    });
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
