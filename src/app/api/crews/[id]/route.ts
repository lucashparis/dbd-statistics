import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail } from "@/lib/crews";
import { mutationError, parseId, parseSeason } from "@/lib/api";

const patchSchema = z.object({
  writePolicy: z.enum(["hostOnly", "allMembers"]),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const crewId = parseId(id);
  if (!crewId) return NextResponse.json({ error: "Invalid crew ID" }, { status: 400 });

  const season = parseSeason(new URL(req.url).searchParams.get("season"));
  const crew = await getCrewDetail(userId, crewId, season);
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  return NextResponse.json(crew);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const crewId = parseId(id);
  if (!crewId) return NextResponse.json({ error: "Invalid crew ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const crew = await prisma.crew.findUnique({ where: { id: crewId }, select: { ownerId: true } });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  if (crew.ownerId !== userId) {
    return NextResponse.json({ error: "Only the host can change this" }, { status: 403 });
  }

  try {
    await prisma.crew.update({ where: { id: crewId }, data: { writePolicy: parsed.data.writePolicy } });
    const detail = await getCrewDetail(userId, crewId, parseSeason(new URL(req.url).searchParams.get("season")));
    return NextResponse.json(detail);
  } catch (e) {
    return mutationError("update crew", e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const crewId = parseId(id);
  if (!crewId) return NextResponse.json({ error: "Invalid crew ID" }, { status: 400 });

  const crew = await prisma.crew.findUnique({ where: { id: crewId }, select: { ownerId: true } });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  if (crew.ownerId !== userId) {
    return NextResponse.json({ error: "Only the host can delete the crew" }, { status: 403 });
  }

  try {
    await prisma.crew.delete({ where: { id: crewId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return mutationError("delete crew", e);
  }
}
