import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serializeTeam } from "@/lib/teams";
import { computeStreaks } from "@/lib/utils";
import { seasonKey, seasonWhere, type SeasonSelection } from "@/lib/seasons";
import type { MatchResult, StreaksData } from "@/types/killer";
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

// A window's runs are rebuilt from the matches inside it: the persisted run
// counters span the whole history, so they cannot answer "how did this streak
// look during season N". `matches` arrives newest-first, and
// `recomputeStreakRuns` walks chronologically — hence the reverse.
export function runsForWindow<T extends { id: number; result: MatchResult; createdAt: Date }>(
  matches: T[],
  persisted: { winCount: number; status: "active" | "ended" }[],
  season: SeasonSelection
): { winCount: number; status: "active" | "ended" }[] {
  if (season === "all") return persisted;
  return recomputeStreakRuns([...matches].reverse());
}

export function currentStreakOf(runs: { winCount: number; status: "active" | "ended" }[]): number {
  return runs.find((r) => r.status === "active")?.winCount ?? 0;
}

export function bestStreakOf(runs: { winCount: number }[]): number {
  return runs.reduce((max, r) => Math.max(max, r.winCount), 0);
}

interface TeamRow {
  id: number;
  name: string;
  createdAt: Date;
  members: { player: { id: number; name: string; nick: string } }[];
}
interface MatchRow {
  id: number;
  teamId: number | null;
  result: MatchResult;
  createdAt: Date;
  killer: { id: number; name: string; imageUrl: string };
}

function buildTeamStreak(
  team: TeamRow,
  runs: { winCount: number; status: "active" | "ended" }[],
  matches: MatchRow[]
): TeamStreak {
  const currentStreak = currentStreakOf(runs);
  const bestStreak = bestStreakOf(runs);
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const totalMatches = matches.length;

  return {
    team: serializeTeam(team),
    currentStreak,
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

export async function getTeamStreaks(
  userId: string,
  season: SeasonSelection = "all"
): Promise<TeamStreak[]> {
  const teams = await prisma.team.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { members: { include: { player: true } } },
  });
  if (teams.length === 0) return [];

  const teamIds = teams.map((t) => t.id);
  const [runs, matches] = await Promise.all([
    prisma.streakRun.findMany({ where: { userId, teamId: { in: teamIds } } }),
    prisma.match.findMany({
      where: { userId, teamId: { in: teamIds }, ...seasonWhere(season) },
      ...matchInclude,
    }),
  ]);

  return teams.map((team) => {
    const teamMatches = matches.filter((m) => m.teamId === team.id);
    const persisted = runs.filter((r) => r.teamId === team.id);
    return buildTeamStreak(team, runsForWindow(teamMatches, persisted, season), teamMatches);
  });
}

// Longest win/loss runs, global and per-killer, derived from the user's matches
// in chronological order. Shared by /api/stats/streaks and the public profile.
export async function computeStreaksForUser(
  userId: string,
  season: SeasonSelection = "all"
): Promise<StreaksData> {
  // Streaks are a survivor-only concept — killer matches never contribute.
  const matches = await prisma.match.findMany({
    where: { userId, perspective: "survivor", ...seasonWhere(season) },
    orderBy: { createdAt: "asc" },
    select: { killerId: true, result: true },
  });

  const global = computeStreaks(matches.map((m) => m.result));

  const byKiller = new Map<number, MatchResult[]>();
  for (const match of matches) {
    const list = byKiller.get(match.killerId) ?? [];
    list.push(match.result);
    byKiller.set(match.killerId, list);
  }

  const perKiller: StreaksData["perKiller"] = {};
  for (const [killerId, results] of byKiller) {
    perKiller[killerId] = computeStreaks(results);
  }

  return { global, perKiller };
}

// Cached per user so the full recompute only runs when a match changes. Match
// mutation routes call `revalidateTag("streaks:<userId>", "max")` to invalidate
// it; `revalidate` is a time-based safety net if a tag call is ever missed.
const STREAKS_TTL_SECONDS = 60;

export function getStreaksForUser(
  userId: string,
  season: SeasonSelection = "all"
): Promise<StreaksData> {
  return unstable_cache(
    () => computeStreaksForUser(userId, season),
    ["streaks", userId, seasonKey(season)],
    { tags: [`streaks:${userId}`], revalidate: STREAKS_TTL_SECONDS }
  )();
}

export async function getTeamStreak(
  userId: string,
  teamId: number,
  season: SeasonSelection = "all"
): Promise<TeamStreak | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId },
    include: { members: { include: { player: true } } },
  });
  if (!team) return null;

  const [runs, matches] = await Promise.all([
    prisma.streakRun.findMany({ where: { userId, teamId } }),
    prisma.match.findMany({ where: { userId, teamId, ...seasonWhere(season) }, ...matchInclude }),
  ]);

  return buildTeamStreak(team, runsForWindow(matches, runs, season), matches);
}
