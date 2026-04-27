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
    const killer = await prisma.killer.update({
      where: { id: killerId },
      data: { wins: { increment: 1 } },
    });
    return NextResponse.json(killer);
  } catch {
    return NextResponse.json(
      { error: "Killer not found or update failed" },
      { status: 404 }
    );
  }
}
