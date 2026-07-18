import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { getStreaksForUser } from "@/lib/streak";
import { computeStats } from "@/lib/utils";
import {
  RANK_MIN_MATCHES,
  type ProfileStats,
  type PublicProfileSummary,
  type PublicProfileDetail,
  type RankMetric,
  type RankEntry,
  type RankViewer,
  type RankPage,
} from "@/types/profile";

// Whitelisted public projection — email/password are never selected.
const publicSelect = {
  userId: true,
  nick: true,
  channelUrl: true,
  updatedAt: true,
  user: { select: { name: true } },
  mainKiller: { select: { id: true, name: true, imageUrl: true } },
  mainSurv: { select: { id: true, name: true, imageUrl: true } },
} as const;

type PublicRow = {
  userId: string;
  nick: string;
  channelUrl: string | null;
  updatedAt: Date;
  user: { name: string | null };
  mainKiller: { id: number; name: string; imageUrl: string } | null;
  mainSurv: { id: number; name: string; imageUrl: string } | null;
};

const ZERO_STATS: ProfileStats = { total: 0, wins: 0, losses: 0, winRate: 0 };
const COMMUNITY_TTL_SECONDS = 60;

function toSummary(row: PublicRow, stats: ProfileStats): PublicProfileSummary {
  return {
    userId: row.userId,
    name: row.user.name,
    nick: row.nick,
    channelUrl: row.channelUrl,
    mainKiller: row.mainKiller,
    mainSurv: row.mainSurv,
    stats,
  };
}

async function statsByUser(userIds: string[]): Promise<Map<string, ProfileStats>> {
  if (userIds.length === 0) return new Map();
  const grouped = await prisma.match.groupBy({
    by: ["userId", "result"],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  });

  const wl = new Map<string, { wins: number; losses: number }>();
  for (const g of grouped) {
    if (!g.userId) continue;
    const cur = wl.get(g.userId) ?? { wins: 0, losses: 0 };
    if (g.result === "win") cur.wins = g._count._all;
    else cur.losses = g._count._all;
    wl.set(g.userId, cur);
  }

  const out = new Map<string, ProfileStats>();
  for (const [userId, { wins, losses }] of wl) {
    const total = wins + losses;
    out.set(userId, {
      total,
      wins,
      losses,
      winRate: total === 0 ? 0 : Math.round((wins / total) * 100),
    });
  }
  return out;
}

async function computePublicProfiles(limit: number): Promise<PublicProfileSummary[]> {
  const profiles = (await prisma.profile.findMany({
    select: publicSelect,
  })) as PublicRow[];
  if (profiles.length === 0) return [];

  const stats = await statsByUser(profiles.map((p) => p.userId));

  return profiles
    .map((p) => ({ row: p, stats: stats.get(p.userId) ?? ZERO_STATS }))
    .sort(
      (a, b) =>
        b.stats.total - a.stats.total ||
        b.row.updatedAt.getTime() - a.row.updatedAt.getTime()
    )
    .slice(0, limit)
    .map(({ row, stats }) => toSummary(row, stats));
}

export async function getPublicProfiles(opts: { limit: number }): Promise<PublicProfileSummary[]> {
  const { limit } = opts;
  try {
    return await unstable_cache(
      () => computePublicProfiles(limit),
      ["community-profiles", String(limit)],
      { tags: ["community"], revalidate: COMMUNITY_TTL_SECONDS }
    )();
  } catch (e) {
    console.error("getPublicProfiles failed", e);
    return [];
  }
}

async function computePublicProfile(userId: string): Promise<PublicProfileDetail | null> {
  const profile = (await prisma.profile.findUnique({
    where: { userId },
    select: publicSelect,
  })) as PublicRow | null;
  if (!profile) return null;

  const [killers, streaks] = await Promise.all([
    getKillersForUser(userId).then((list) => list.map(computeStats)),
    getStreaksForUser(userId),
  ]);

  const wins = killers.reduce((s, k) => s + k.wins, 0);
  const losses = killers.reduce((s, k) => s + k.losses, 0);
  const total = wins + losses;
  const stats: ProfileStats = {
    total,
    wins,
    losses,
    winRate: total === 0 ? 0 : Math.round((wins / total) * 100),
  };

  return { ...toSummary(profile, stats), killers, streaks };
}

export async function getPublicProfile(userId: string): Promise<PublicProfileDetail | null> {
  try {
    return await unstable_cache(
      () => computePublicProfile(userId),
      ["community-profile", userId],
      { tags: ["community", `profile:${userId}`], revalidate: COMMUNITY_TTL_SECONDS }
    )();
  } catch (e) {
    console.error("getPublicProfile failed", e);
    return null;
  }
}

function rankComparator(metric: RankMetric) {
  return (a: PublicProfileSummary, b: PublicProfileSummary) => {
    if (metric === "wins") {
      return (
        b.stats.wins - a.stats.wins ||
        b.stats.total - a.stats.total ||
        a.userId.localeCompare(b.userId)
      );
    }
    if (metric === "winRate") {
      return (
        b.stats.winRate - a.stats.winRate ||
        b.stats.total - a.stats.total ||
        a.userId.localeCompare(b.userId)
      );
    }
    return (
      b.stats.total - a.stats.total ||
      b.stats.wins - a.stats.wins ||
      a.userId.localeCompare(b.userId)
    );
  };
}

async function computeRankBase(metric: RankMetric): Promise<RankEntry[]> {
  const profiles = (await prisma.profile.findMany({ select: publicSelect })) as PublicRow[];
  if (profiles.length === 0) return [];

  const stats = await statsByUser(profiles.map((p) => p.userId));

  return profiles
    .map((p) => toSummary(p, stats.get(p.userId) ?? ZERO_STATS))
    .filter((s) => s.stats.total >= RANK_MIN_MATCHES)
    .sort(rankComparator(metric))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// Resolves the viewer's own standing. If they're in the eligible base (found by
// id), no extra query runs. Otherwise two cheap indexed lookups tell apart "has
// a profile but < RANK_MIN_MATCHES" from "no public profile yet".
async function resolveRankViewer(base: RankEntry[], viewerId: string): Promise<RankViewer> {
  const entry = base.find((e) => e.userId === viewerId);
  if (entry) return { status: "ranked", entry };

  const [profile, total] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: viewerId }, select: { userId: true } }),
    prisma.match.count({ where: { userId: viewerId } }),
  ]);
  if (!profile) return { status: "noProfile" };
  return { status: "belowThreshold", total, remaining: Math.max(0, RANK_MIN_MATCHES - total) };
}

// The rank is 1-indexed over the full eligible list ordered by the active
// metric, assigned *before* the search filter — so a viewer searching their own
// nick sees their true position, and `me` is always the global position.
export async function getRankedProfiles(opts: {
  metric: RankMetric;
  search: string;
  page: number;
  pageSize: number;
  viewerId: string;
}): Promise<RankPage> {
  const { metric, search, page, pageSize, viewerId } = opts;
  try {
    const base = await unstable_cache(
      () => computeRankBase(metric),
      ["rank-base", metric],
      { tags: ["community"], revalidate: COMMUNITY_TTL_SECONDS }
    )();

    const me = await resolveRankViewer(base, viewerId);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? base.filter(
          (e) => (e.name ?? "").toLowerCase().includes(q) || e.nick.toLowerCase().includes(q)
        )
      : base;

    const start = (page - 1) * pageSize;
    const upTo = start + pageSize;
    return { entries: filtered.slice(start, upTo), hasMore: filtered.length > upTo, me };
  } catch (e) {
    console.error("getRankedProfiles failed", e);
    return { entries: [], hasMore: false, me: null };
  }
}
