import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  nick: z.string().trim().min(1).max(40),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const players = await prisma.player.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, nick } = parsed.data;
  const existing = await prisma.player.findUnique({
    where: { userId_nick: { userId, nick } },
  });
  if (existing) {
    return NextResponse.json({ error: "Nick already exists" }, { status: 409 });
  }

  const player = await prisma.player.create({ data: { userId, name, nick } });
  return NextResponse.json(player, { status: 201 });
}
