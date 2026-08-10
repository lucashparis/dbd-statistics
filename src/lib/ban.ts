import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BAN_CODE, BAN_DESCRIPTION, BAN_TITLE } from "@/lib/ban-message";
import type { BanView } from "@/types/ban";

// A ban is active while it has not been lifted. History rows keep `liftedAt`.
const ACTIVE = { liftedAt: null } as const;

export async function isBanned(userId: string): Promise<boolean> {
  const row = await prisma.ban.findFirst({
    where: { userId, ...ACTIVE },
    select: { id: true },
  });
  return row !== null;
}

export function bannedResponse(): NextResponse {
  return NextResponse.json(
    { code: BAN_CODE, error: BAN_TITLE, description: BAN_DESCRIPTION },
    { status: 403 }
  );
}

// The single gate for every action a banned user may not perform: logging or
// undoing a match, hosting a crew, and any crew write. Returns the 403 to bail
// with, or null to continue. Being *part* of someone else's crew match stays
// allowed — that match is logged by another user and still counts.
export async function blockIfBanned(userId: string): Promise<NextResponse | null> {
  return (await isBanned(userId)) ? bannedResponse() : null;
}

const banSelect = {
  id: true,
  reason: true,
  createdAt: true,
  liftedAt: true,
  user: {
    select: { id: true, name: true, profile: { select: { nick: true } } },
  },
  bannedBy: { select: { name: true, profile: { select: { nick: true } } } },
} as const;

interface BanRow {
  id: string;
  reason: string;
  createdAt: Date;
  liftedAt: Date | null;
  user: { id: string; name: string | null; profile: { nick: string } | null };
  bannedBy: { name: string | null; profile: { nick: string } | null };
}

function toView(b: BanRow): BanView {
  return {
    id: b.id,
    userId: b.user.id,
    name: b.user.name,
    nick: b.user.profile?.nick ?? null,
    reason: b.reason,
    createdAt: b.createdAt.toISOString(),
    liftedAt: b.liftedAt?.toISOString() ?? null,
    bannedBy: b.bannedBy.profile?.nick ?? b.bannedBy.name,
  };
}

// Admin projection: never selects email or password, only the same public
// identity fields the community already exposes.
export async function listBans(): Promise<BanView[]> {
  const rows = (await prisma.ban.findMany({
    orderBy: [{ liftedAt: "asc" }, { createdAt: "desc" }],
    select: banSelect,
  })) as unknown as BanRow[];
  return rows.map(toView);
}

export async function getBan(id: string): Promise<BanView | null> {
  const row = (await prisma.ban.findUnique({
    where: { id },
    select: banSelect,
  })) as unknown as BanRow | null;
  return row ? toView(row) : null;
}
