import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getBan, isBanned, listBans } from "@/lib/ban";
import { mutationError } from "@/lib/api";

const createSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  return NextResponse.json(await listBans());
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { userId, reason } = parsed.data;

  if (userId === guard.userId) {
    return NextResponse.json({ error: "You cannot ban yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (await isBanned(userId)) {
    return NextResponse.json({ error: "User is already on the ban list" }, { status: 409 });
  }

  try {
    const ban = await prisma.ban.create({
      data: { userId, reason, bannedById: guard.userId },
      select: { id: true },
    });
    revalidateTag("community", "max");
    return NextResponse.json(await getBan(ban.id), { status: 201 });
  } catch (e) {
    return mutationError("create ban", e);
  }
}
