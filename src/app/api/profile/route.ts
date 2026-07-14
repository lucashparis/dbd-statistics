import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { mutationError } from "@/lib/api";
import type { MyProfile } from "@/types/profile";

const entityRefSelect = { id: true, name: true, imageUrl: true } as const;
const profileSelect = {
  nick: true,
  channelUrl: true,
  mainKiller: { select: entityRefSelect },
  mainSurv: { select: entityRefSelect },
} as const;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  nick: z.string().trim().min(1).max(40),
  channelUrl: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).refine(isHttpsUrl, "Must be a valid https URL").nullable()
  ),
  mainKillerId: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
  mainSurvId: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.profile.findUnique({ where: { userId }, select: profileSelect }),
    ]);

    const payload: MyProfile = {
      name: user?.name ?? null,
      nick: profile?.nick ?? "",
      channelUrl: profile?.channelUrl ?? null,
      mainKiller: profile?.mainKiller ?? null,
      mainSurv: profile?.mainSurv ?? null,
      isPublic: profile !== null,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("profile GET failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, nick, channelUrl, mainKillerId, mainSurvId } = parsed.data;

  if (mainKillerId != null) {
    const killer = await prisma.killer.findUnique({
      where: { id: mainKillerId },
      select: { id: true },
    });
    if (!killer) {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
  }

  if (mainSurvId != null) {
    const survivor = await prisma.survivor.findUnique({
      where: { id: mainSurvId },
      select: { id: true },
    });
    if (!survivor) {
      return NextResponse.json({ error: "Survivor not found" }, { status: 404 });
    }
  }

  try {
    const { user, profile } = await prisma.$transaction(async (tx) => {
      const user =
        name !== undefined
          ? await tx.user.update({ where: { id: userId }, data: { name }, select: { name: true } })
          : await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
      const profile = await tx.profile.upsert({
        where: { userId },
        create: { userId, nick, channelUrl, mainKillerId, mainSurvId },
        update: { nick, channelUrl, mainKillerId, mainSurvId },
        select: profileSelect,
      });
      return { user, profile };
    });

    revalidateTag("community", "max");
    revalidateTag(`profile:${userId}`, "max");

    const payload: MyProfile = {
      name: user?.name ?? null,
      nick: profile.nick,
      channelUrl: profile.channelUrl,
      mainKiller: profile.mainKiller,
      mainSurv: profile.mainSurv,
      isPublic: true,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return mutationError("profile update", e);
  }
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.profile.deleteMany({ where: { userId } });
    revalidateTag("community", "max");
    revalidateTag(`profile:${userId}`, "max");
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return mutationError("profile delete", e);
  }
}
