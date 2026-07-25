import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parsePage, parsePerspective, parseSeason } from "@/lib/api";
import { seasonWhere } from "@/lib/seasons";

const LIMIT = 10;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const page = parsePage(searchParams.get("page"));
    const perspective = parsePerspective(searchParams.get("perspective"));
    const season = parseSeason(searchParams.get("season"));
    const skip = (page - 1) * LIMIT;
    // The count must carry the same window as the page, otherwise `hasMore`
    // reports against the all-time total and the list asks for empty pages.
    const where = { userId, perspective, ...seasonWhere(season) };

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip,
        take: LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          killer: { select: { id: true, name: true, imageUrl: true } },
        },
      }),
      prisma.match.count({ where }),
    ]);

    return NextResponse.json({
      matches,
      total,
      hasMore: skip + matches.length < total,
    });
  } catch (e) {
    console.error("history route failed", e);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
