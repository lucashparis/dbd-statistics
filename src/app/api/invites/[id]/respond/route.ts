import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { mutationError, parseId } from "@/lib/api";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const memberId = parseId(id);
  if (!memberId) return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const invite = await prisma.crewMember.findUnique({ where: { id: memberId } });
  if (!invite || invite.userId !== userId) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite already answered" }, { status: 409 });
  }

  try {
    await prisma.crewMember.update({
      where: { id: memberId },
      data: {
        status: parsed.data.action === "accept" ? "accepted" : "declined",
        respondedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return mutationError("respond to invite", e);
  }
}
