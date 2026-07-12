import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    nick: z.string().trim().min(1).max(40).optional(),
  })
  .refine((d) => d.name !== undefined || d.nick !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (isNaN(playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.userId !== userId) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Nick already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (isNaN(playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.userId !== userId) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const inTeam = await prisma.teamPlayer.count({ where: { playerId } });
  if (inTeam > 0) {
    return NextResponse.json(
      { error: "Player belongs to a team — remove them first" },
      { status: 409 }
    );
  }

  await prisma.player.delete({ where: { id: playerId } });
  return new NextResponse(null, { status: 204 });
}
