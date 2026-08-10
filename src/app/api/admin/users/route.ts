import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { BannableUser } from "@/types/ban";

const LIMIT = 8;

// Search over the same public identity fields the community exposes (nick and
// display name) — never email. Only users with a public profile are searchable,
// which is exactly the population that can distort the ranking.
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([] as BannableUser[]);

  const profiles = await prisma.profile.findMany({
    where: {
      userId: { not: guard.userId },
      OR: [
        { nick: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    take: LIMIT,
    orderBy: { nick: "asc" },
    select: {
      userId: true,
      nick: true,
      user: { select: { name: true, bans: { where: { liftedAt: null }, select: { id: true } } } },
      mainKiller: { select: { imageUrl: true } },
    },
  });

  const result: BannableUser[] = profiles.map((p) => ({
    userId: p.userId,
    nick: p.nick,
    name: p.user.name,
    imageUrl: p.mainKiller?.imageUrl ?? null,
    isBanned: p.user.bans.length > 0,
  }));
  return NextResponse.json(result);
}
