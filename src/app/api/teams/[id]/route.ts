import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { serializeTeam } from "@/lib/teams";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    playerIds: z.array(z.number().int()).min(1).max(4).optional(),
  })
  .refine((d) => d.name !== undefined || d.playerIds !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.userId !== userId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const playerIds = parsed.data.playerIds
    ? [...new Set(parsed.data.playerIds)]
    : undefined;

  if (playerIds) {
    const owned = await prisma.player.count({
      where: { id: { in: playerIds }, userId },
    });
    if (owned !== playerIds.length) {
      return NextResponse.json({ error: "Invalid players" }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(playerIds
          ? { members: { deleteMany: {}, create: playerIds.map((playerId) => ({ playerId })) } }
          : {}),
      },
      include: { members: { include: { player: true } } },
    });
    return NextResponse.json(serializeTeam(updated));
  } catch {
    return NextResponse.json({ error: "Team name already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.userId !== userId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await prisma.team.delete({ where: { id: teamId } });
  return new NextResponse(null, { status: 204 });
}
