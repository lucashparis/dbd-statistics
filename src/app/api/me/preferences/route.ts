import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { mutationError } from "@/lib/api";
import type { Perspective } from "@/types/killer";

const bodySchema = z.object({ mode: z.enum(["survivor", "killer"]) });

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredMode: parsed.data.mode },
    });
    return NextResponse.json({ mode: parsed.data.mode satisfies Perspective });
  } catch (e) {
    return mutationError("preferences update", e);
  }
}
