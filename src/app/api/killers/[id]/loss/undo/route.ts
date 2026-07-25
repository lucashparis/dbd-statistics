import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";
import { parseId, parsePerspective, parseSeason, readOnlySeason } from "@/lib/api";
import { seasonWhere } from "@/lib/seasons";

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

    // Only quick-log matches (teamId null) can be undone here — streak matches
    // are managed from the Streak tab. The window keeps the undo from reaching
    // back into a season the user is not looking at.
    const lastLoss = await prisma.match.findFirst({
      where: { userId, killerId, result: "loss", teamId: null, perspective, ...seasonWhere(season) },
      orderBy: { createdAt: "desc" },
    });
    if (lastLoss) {
      await prisma.match.delete({ where: { id: lastLoss.id } });
      if (perspective === "survivor") revalidateTag(`streaks:${userId}`, "max");
      revalidateTag("community", "max");
    }

    const killer = await getKillerForUser(userId, killerId, perspective, season);
    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    return NextResponse.json(killer);
  } catch (e) {
    console.error("loss undo failed", e);
    return NextResponse.json({ error: "Failed to undo loss" }, { status: 500 });
  }
}
