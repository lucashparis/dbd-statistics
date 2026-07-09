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
      if (current.losses === 0) return current;

      const lastLoss = await tx.match.findFirst({
        where: { killerId, result: "loss" },
        orderBy: { createdAt: "desc" },
      });
      if (lastLoss) await tx.match.delete({ where: { id: lastLoss.id } });

      return tx.killer.update({
        where: { id: killerId },
        data: { losses: { decrement: 1 } },
      });
    });

    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    return NextResponse.json(killer);
  } catch (e) {
    console.error("loss undo failed", e);
    return NextResponse.json({ error: "Failed to undo loss" }, { status: 500 });
  }
}
