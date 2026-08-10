import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail } from "@/lib/crews";
import { blockIfBanned } from "@/lib/ban";
import { mutationError, parseId, parseSeason } from "@/lib/api";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const callerId = await getSessionUserId();
  if (!callerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId: targetId } = await params;
  const crewId = parseId(id);
  if (!crewId) return NextResponse.json({ error: "Invalid crew ID" }, { status: 400 });

  const banned = await blockIfBanned(callerId);
  if (banned) return banned;

  const crew = await prisma.crew.findUnique({ where: { id: crewId }, select: { ownerId: true } });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  if (crew.ownerId !== callerId) {
    return NextResponse.json({ error: "Only the host can remove members" }, { status: 403 });
  }
  if (targetId === crew.ownerId) {
    return NextResponse.json({ error: "The host cannot be removed" }, { status: 400 });
  }

  try {
    await prisma.crewMember.delete({ where: { crewId_userId: { crewId, userId: targetId } } });
    const season = parseSeason(new URL(req.url).searchParams.get("season"));
    const detail = await getCrewDetail(callerId, crewId, season, false);
    return NextResponse.json(detail);
  } catch (e) {
    return mutationError("remove crew member", e);
  }
}
