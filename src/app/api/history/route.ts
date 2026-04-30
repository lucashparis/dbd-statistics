import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LIMIT = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const skip = (page - 1) * LIMIT;

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      skip,
      take: LIMIT,
      orderBy: { createdAt: "desc" },
      include: {
        killer: { select: { id: true, name: true, imageUrl: true } },
      },
    }),
    prisma.match.count(),
  ]);

  return NextResponse.json({
    matches,
    total,
    hasMore: skip + matches.length < total,
  });
}
