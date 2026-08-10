import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getBan } from "@/lib/ban";
import { mutationError } from "@/lib/api";

// Lifting a ban keeps the row as history — it only stamps who lifted it and when.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await params;
  const ban = await prisma.ban.findUnique({ where: { id }, select: { liftedAt: true } });
  if (!ban) return NextResponse.json({ error: "Ban not found" }, { status: 404 });
  if (ban.liftedAt) return NextResponse.json({ error: "Ban already lifted" }, { status: 409 });

  try {
    await prisma.ban.update({
      where: { id },
      data: { liftedAt: new Date(), liftedById: guard.userId },
    });
    revalidateTag("community", "max");
    return NextResponse.json(await getBan(id));
  } catch (e) {
    return mutationError("lift ban", e);
  }
}
