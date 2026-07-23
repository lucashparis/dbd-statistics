import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";
import { parseId, parsePerspective, mutationError } from "@/lib/api";

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
    await prisma.match.create({
      data: { userId, killerId, result: "win", teamId: null, perspective },
    });
    if (perspective === "survivor") revalidateTag(`streaks:${userId}`, "max");
    revalidateTag("community", "max");
    const killer = await getKillerForUser(userId, killerId, perspective);
    return NextResponse.json(killer);
  } catch (e) {
    return mutationError("win route", e);
  }
}
