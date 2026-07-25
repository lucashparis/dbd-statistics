import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { mutationError } from "@/lib/api";
import type { Perspective } from "@/types/killer";

// The season field stores an *intent*, not a resolved id: "current" follows the
// rollover so a saved preference never pins a finished season.
const bodySchema = z
  .object({
    mode: z.enum(["survivor", "killer"]).optional(),
    season: z
      .union([z.literal("current"), z.literal("all"), z.string().regex(/^\d+$/)])
      .optional(),
  })
  .refine((body) => body.mode !== undefined || body.season !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { mode, season } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(mode ? { preferredMode: mode } : {}),
        ...(season ? { preferredSeason: season } : {}),
      },
    });
    return NextResponse.json({
      ...(mode ? { mode: mode satisfies Perspective } : {}),
      ...(season ? { season } : {}),
    });
  } catch (e) {
    return mutationError("preferences update", e);
  }
}
