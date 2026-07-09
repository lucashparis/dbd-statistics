import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LIMIT = 10;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
  } catch (e) {
    console.error("history route failed", e);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
