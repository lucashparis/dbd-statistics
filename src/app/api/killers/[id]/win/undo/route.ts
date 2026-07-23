import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";
import { parseId, parsePerspective } from "@/lib/api";

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

  try {
    const userId = session.user.id;
    const perspective = parsePerspective(new URL(req.url).searchParams.get("perspective"));

    // Only quick-log matches (teamId null) can be undone here — streak matches
    // are managed from the Streak tab.
    const lastWin = await prisma.match.findFirst({
      where: { userId, killerId, result: "win", teamId: null, perspective },
      orderBy: { createdAt: "desc" },
    });
    if (lastWin) {
      await prisma.match.delete({ where: { id: lastWin.id } });
      if (perspective === "survivor") revalidateTag(`streaks:${userId}`, "max");
      revalidateTag("community", "max");
    }

    const killer = await getKillerForUser(userId, killerId, perspective);
    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    return NextResponse.json(killer);
  } catch (e) {
    console.error("win undo failed", e);
    return NextResponse.json({ error: "Failed to undo win" }, { status: 500 });
  }
}
