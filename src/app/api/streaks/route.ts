import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreaks } from "@/lib/streak";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const streaks = await getTeamStreaks(userId);
  return NextResponse.json(streaks);
}
