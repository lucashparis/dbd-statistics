import { prisma } from "@/lib/prisma";
import { bestStreakOf, currentStreakOf, runsForWindow } from "@/lib/streak";
import { seasonWhere, type SeasonSelection } from "@/lib/seasons";
import type { MatchResult } from "@/types/killer";
import type {
  Crew,
  CrewMatchView,
  CrewMemberView,
  CrewMemberStatus,
  CrewWritePolicy,
  Invite,
} from "@/types/crew";

const memberInclude = {
  orderBy: { invitedAt: "asc" },
  include: {
    user: {
      select: {
        name: true,
        profile: { select: { nick: true, mainKiller: { select: { imageUrl: true } } } },
      },
    },
  },
} as const;

const matchInclude = {
  orderBy: { createdAt: "desc" },
  include: {
    killer: { select: { id: true, name: true, imageUrl: true } },
    loggedBy: { select: { id: true, name: true, profile: { select: { nick: true } } } },
  },
} as const;

// A season narrows which CrewMatch rows are loaded; members and the write gate
// are never season-scoped. `all` keeps the query identical to the pre-seasons one.
function crewInclude(season: SeasonSelection) {
  return {
    members: memberInclude,
    streaks: true,
    matches: { ...matchInclude, where: seasonWhere(season) },
  } as const;
}

interface MemberRow {
  userId: string;
  status: CrewMemberStatus;
  isOwner: boolean;
  user: {
    name: string | null;
    profile: { nick: string; mainKiller: { imageUrl: string } | null } | null;
  };
}
interface RunRow {
  winCount: number;
  status: "active" | "ended";
}
interface CrewMatchRow {
  id: number;
  result: MatchResult;
  createdAt: Date;
  killer: { id: number; name: string; imageUrl: string };
  loggedBy: { id: string; name: string | null; profile: { nick: string } | null };
}
interface CrewRow {
  id: number;
  name: string;
  writePolicy: CrewWritePolicy;
  ownerId: string;
  members: MemberRow[];
  streaks: RunRow[];
  matches: CrewMatchRow[];
}

function toMemberView(m: MemberRow): CrewMemberView {
  return {
    userId: m.userId,
    name: m.user.name,
    nick: m.user.profile?.nick ?? null,
    imageUrl: m.user.profile?.mainKiller?.imageUrl ?? null,
    status: m.status,
    isOwner: m.isOwner,
  };
}

// A crew is ready to log only when every invited member has accepted — no
// pending or declined rows remain. The owner unblocks a stuck crew by removing
// members that never accepted.
export function isCrewReady(members: { status: CrewMemberStatus }[]): boolean {
  return members.every((m) => m.status === "accepted");
}

// The single write gate, shared by the log and delete-match routes: a member may
// write only when the crew is ready and the policy allows them (owner always
// may; other members only when the policy is `allMembers`). A banned viewer
// never writes — they stay a member so matches logged by the others still fan
// out to them, but the log/delete controls are theirs no more.
export function canWrite(
  members: { userId: string; status: CrewMemberStatus }[],
  writePolicy: CrewWritePolicy,
  ownerId: string,
  viewerId: string,
  viewerBanned = false
): boolean {
  if (viewerBanned) return false;
  const membership = members.find((m) => m.userId === viewerId);
  if (!membership || membership.status !== "accepted") return false;
  if (!isCrewReady(members)) return false;
  return writePolicy === "allMembers" || viewerId === ownerId;
}

function serializeCrew(
  crew: CrewRow,
  viewerId: string,
  season: SeasonSelection,
  viewerBanned: boolean
): Crew {
  // All time reads the persisted runs (the write path's source of truth); a
  // season window rebuilds them from the matches inside it, so a run that opened
  // before the rollover shows only the wins that fall in the window.
  const runs = runsForWindow(crew.matches, crew.streaks, season);
  const wins = crew.matches.filter((m) => m.result === "win").length;
  const losses = crew.matches.filter((m) => m.result === "loss").length;
  const total = crew.matches.length;

  const matches: CrewMatchView[] = crew.matches.map((m) => ({
    id: m.id,
    result: m.result,
    createdAt: m.createdAt.toISOString(),
    killer: m.killer,
    loggedBy: {
      userId: m.loggedBy.id,
      name: m.loggedBy.name,
      nick: m.loggedBy.profile?.nick ?? null,
    },
  }));

  return {
    id: crew.id,
    name: crew.name,
    writePolicy: crew.writePolicy,
    ownerId: crew.ownerId,
    isOwner: crew.ownerId === viewerId,
    isReady: isCrewReady(crew.members),
    canWrite: canWrite(crew.members, crew.writePolicy, crew.ownerId, viewerId, viewerBanned),
    members: crew.members.map(toMemberView),
    currentStreak: currentStreakOf(runs),
    bestStreak: bestStreakOf(runs),
    totalMatches: total,
    wins,
    losses,
    winRate: total === 0 ? 0 : Math.round((wins / total) * 100),
    matches,
  };
}

export async function getCrewsForUser(
  viewerId: string,
  season: SeasonSelection = "all",
  viewerBanned = false
): Promise<Crew[]> {
  const memberships = await prisma.crewMember.findMany({
    where: { userId: viewerId, status: "accepted" },
    select: { crewId: true },
  });
  const crewIds = memberships.map((m) => m.crewId);
  if (crewIds.length === 0) return [];

  const crews = (await prisma.crew.findMany({
    where: { id: { in: crewIds } },
    orderBy: { createdAt: "asc" },
    include: crewInclude(season),
  })) as unknown as CrewRow[];

  return crews.map((c) => serializeCrew(c, viewerId, season, viewerBanned));
}

export async function getCrewDetail(
  viewerId: string,
  crewId: number,
  season: SeasonSelection = "all",
  viewerBanned = false
): Promise<Crew | null> {
  const crew = (await prisma.crew.findUnique({
    where: { id: crewId },
    include: crewInclude(season),
  })) as unknown as CrewRow | null;
  if (!crew) return null;

  const membership = crew.members.find((m) => m.userId === viewerId);
  if (!membership || membership.status !== "accepted") return null;

  return serializeCrew(crew, viewerId, season, viewerBanned);
}

export async function getInvitesForUser(userId: string): Promise<Invite[]> {
  const rows = await prisma.crewMember.findMany({
    where: { userId, status: "pending" },
    orderBy: { invitedAt: "desc" },
    select: {
      id: true,
      invitedAt: true,
      crew: {
        select: {
          id: true,
          name: true,
          owner: { select: { name: true, profile: { select: { nick: true } } } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    crew: { id: r.crew.id, name: r.crew.name },
    invitedBy: { name: r.crew.owner.name, nick: r.crew.owner.profile?.nick ?? null },
    invitedAt: r.invitedAt.toISOString(),
  }));
}

// Invite-by-community-nick contract: only users who opted into a public Profile
// are invitable. The owner is silently excluded (already an accepted member).
export async function resolveInvitees(
  userIds: string[],
  ownerId: string
): Promise<{ ok: true; ids: string[] } | { ok: false }> {
  const ids = [...new Set(userIds)].filter((id) => id !== ownerId);
  if (ids.length === 0) return { ok: true, ids: [] };

  const profiles = await prisma.profile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true },
  });
  if (profiles.length !== ids.length) return { ok: false };

  return { ok: true, ids };
}
