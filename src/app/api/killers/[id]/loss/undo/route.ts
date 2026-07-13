import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";
import { parseId } from "@/lib/api";

export async function PATCH(
  _req: Request,
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

    // Only quick-log matches (teamId null) can be undone here — streak matches
    // are managed from the Streak tab.
    const lastLoss = await prisma.match.findFirst({
      where: { userId, killerId, result: "loss", teamId: null },
      orderBy: { createdAt: "desc" },
    });
    if (lastLoss) {
      await prisma.match.delete({ where: { id: lastLoss.id } });
      revalidateTag(`streaks:${userId}`, "max");
    }

    const killer = await getKillerForUser(userId, killerId);
    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    return NextResponse.json(killer);
  } catch (e) {
    console.error("loss undo failed", e);
    return NextResponse.json({ error: "Failed to undo loss" }, { status: 500 });
  }
}
