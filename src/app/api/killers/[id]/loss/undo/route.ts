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
    const current = await prisma.killer.findUnique({ where: { id: killerId } });
    if (!current) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    if (current.losses === 0) {
      return NextResponse.json(current);
    }
    const killer = await prisma.killer.update({
      where: { id: killerId },
      data: { losses: { decrement: 1 } },
    });
    return NextResponse.json(killer);
  } catch {
    return NextResponse.json(
      { error: "Killer not found or update failed" },
      { status: 404 }
    );
  }
}
