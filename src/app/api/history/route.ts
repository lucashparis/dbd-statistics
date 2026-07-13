import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parsePage } from "@/lib/api";

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
    const skip = (page - 1) * LIMIT;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where: { userId },
        skip,
        take: LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          killer: { select: { id: true, name: true, imageUrl: true } },
        },
      }),
      prisma.match.count({ where: { userId } }),
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
