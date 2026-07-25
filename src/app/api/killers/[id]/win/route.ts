import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";
import { parseId, parsePerspective, parseSeason, readOnlySeason, mutationError } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const killerId = parseId(id);
  if (killerId === null) {
    return NextResponse.json({ error: "Invalid killer ID" }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const perspective = parsePerspective(sp.get("perspective"));
  const season = parseSeason(sp.get("season"));
  const blocked = readOnlySeason(season);
  if (blocked) return blocked;

  try {
    const userId = session.user.id;
    await prisma.match.create({
      data: { userId, killerId, result: "win", teamId: null, perspective },
    });
    if (perspective === "survivor") revalidateTag(`streaks:${userId}`, "max");
    revalidateTag("community", "max");
    const killer = await getKillerForUser(userId, killerId, perspective, season);
    return NextResponse.json(killer);
  } catch (e) {
    return mutationError("win route", e);
  }
}
