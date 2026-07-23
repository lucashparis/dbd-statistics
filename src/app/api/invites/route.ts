import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getInvitesForUser } from "@/lib/crews";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await getInvitesForUser(userId);
  return NextResponse.json(invites);
}
