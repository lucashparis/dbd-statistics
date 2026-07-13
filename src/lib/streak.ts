import { prisma } from "@/lib/prisma";
import { serializeTeam } from "@/lib/teams";
import type { MatchResult } from "@/types/killer";
import type { TeamStreak } from "@/types/team";

export interface StreakAction {
  createRun: boolean;
  incrementWin: boolean;
  closeRun: boolean;
  attachToRun: boolean;
}

// Pure decision: given whether the team already has an active run and the
// result being logged, what should happen to the streak run + match link.
export function decideStreakAction(hasActiveRun: boolean, result: MatchResult): StreakAction {
  if (result === "win") {
    return { createRun: !hasActiveRun, incrementWin: true, closeRun: false, attachToRun: true };
  }
  // A loss ends the active run (if any). Losses outside a run are just recorded.
  return { createRun: false, incrementWin: false, closeRun: hasActiveRun, attachToRun: hasActiveRun };
}

export interface ComputedRun {
  winCount: number;
  status: "active" | "ended";
  startedAt: Date;
  endedAt: Date | null;
  matchIds: number[];
}

// Reconstruct a team's streak runs from its matches in chronological (ascending)
// order — a win extends/opens the active run, a loss closes it. Used to rebuild
// run state from scratch after a match is deleted, so counters can never drift.
export function recomputeStreakRuns(
  matches: { id: number; result: MatchResult; createdAt: Date }[]
): ComputedRun[] {
  const runs: ComputedRun[] = [];
  let current: ComputedRun | null = null;

  for (const m of matches) {
    if (m.result === "win") {
      if (!current) {
        current = { winCount: 0, status: "active", startedAt: m.createdAt, endedAt: null, matchIds: [] };
        runs.push(current);
      }
      current.winCount += 1;
      current.matchIds.push(m.id);
      continue;
    }
    if (!current) continue;
    current.status = "ended";
    current.endedAt = m.createdAt;
    current.matchIds.push(m.id);
    current = null;
  }

  return runs;
}

interface TeamRow {
  id: number;
  name: string;
  createdAt: Date;
  members: { player: { id: number; name: string; nick: string } }[];
}
interface RunRow {
  teamId: number;
  winCount: number;
  status: "active" | "ended";
}
interface MatchRow {
  id: number;
  teamId: number | null;
  result: MatchResult;
  createdAt: Date;
  killer: { id: number; name: string; imageUrl: string };
}

function buildTeamStreak(team: TeamRow, runs: RunRow[], matches: MatchRow[]): TeamStreak {
  const activeRun = runs.find((r) => r.status === "active");
  const bestStreak = runs.reduce((max, r) => Math.max(max, r.winCount), 0);
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const totalMatches = matches.length;

  return {
    team: serializeTeam(team),
    currentStreak: activeRun?.winCount ?? 0,
    bestStreak,
    totalMatches,
    wins,
    losses,
    winRate: totalMatches === 0 ? 0 : Math.round((wins / totalMatches) * 100),
    matches: matches.map((m) => ({
      id: m.id,
      result: m.result,
      createdAt: m.createdAt.toISOString(),
      killer: { id: m.killer.id, name: m.killer.name, imageUrl: m.killer.imageUrl },
    })),
  };
}

const matchInclude = {
  orderBy: { createdAt: "desc" },
  include: { killer: { select: { id: true, name: true, imageUrl: true } } },
} as const;

export async function getTeamStreaks(userId: string): Promise<TeamStreak[]> {
  const teams = await prisma.team.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { members: { include: { player: true } } },
  });
  if (teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const [runs, matches] = await Promise.all([
    prisma.streakRun.findMany({ where: { userId, teamId: { in: teamIds } } }),
    prisma.match.findMany({ where: { userId, teamId: { in: teamIds } }, ...matchInclude }),
  ]);

  return teams.map((team) =>
    buildTeamStreak(
      team,
      runs.filter((r) => r.teamId === team.id),
      matches.filter((m) => m.teamId === team.id)
    )
  );
}

export async function getTeamStreak(userId: string, teamId: number): Promise<TeamStreak | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId },
    include: { members: { include: { player: true } } },
  });
  if (!team) return null;

  const [runs, matches] = await Promise.all([
    prisma.streakRun.findMany({ where: { userId, teamId } }),
    prisma.match.findMany({ where: { userId, teamId }, ...matchInclude }),
  ]);

  return buildTeamStreak(team, runs, matches);
}
