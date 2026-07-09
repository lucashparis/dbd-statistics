import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const killerId = parseInt(id, 10);

  if (isNaN(killerId)) {
    return NextResponse.json({ error: "Invalid killer ID" }, { status: 400 });
  }

  try {
    const killer = await prisma.$transaction(async (tx) => {
      const current = await tx.killer.findUnique({ where: { id: killerId } });
      if (!current) return null;
      if (current.wins === 0) return current;

      const lastWin = await tx.match.findFirst({
        where: { killerId, result: "win" },
        orderBy: { createdAt: "desc" },
      });
      if (lastWin) await tx.match.delete({ where: { id: lastWin.id } });

      return tx.killer.update({
        where: { id: killerId },
        data: { wins: { decrement: 1 } },
      });
    });

    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    return NextResponse.json(killer);
  } catch (e) {
    console.error("win undo failed", e);
    return NextResponse.json({ error: "Failed to undo win" }, { status: 500 });
  }
}
