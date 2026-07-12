import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillerForUser } from "@/lib/killers";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const killerId = parseInt(id, 10);
  if (isNaN(killerId)) {
    return NextResponse.json({ error: "Invalid killer ID" }, { status: 400 });
  }

  try {
    await prisma.match.create({
      data: { userId: session.user.id, killerId, result: "win", teamId: null },
    });
    const killer = await getKillerForUser(session.user.id, killerId);
    return NextResponse.json(killer);
  } catch {
    return NextResponse.json(
      { error: "Killer not found or update failed" },
      { status: 404 }
    );
  }
}
