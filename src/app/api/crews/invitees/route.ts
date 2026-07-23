import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import type { Invitee } from "@/types/crew";

const LIMIT = 8;

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([] as Invitee[]);

  const profiles = await prisma.profile.findMany({
    where: {
      userId: { not: userId },
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
      user: { select: { name: true } },
      mainKiller: { select: { imageUrl: true } },
    },
  });

  const result: Invitee[] = profiles.map((p) => ({
    userId: p.userId,
    nick: p.nick,
    name: p.user.name,
    imageUrl: p.mainKiller?.imageUrl ?? null,
  }));
  return NextResponse.json(result);
}
