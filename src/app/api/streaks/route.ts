import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreaks } from "@/lib/streak";
import { parseSeason } from "@/lib/api";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const season = parseSeason(new URL(req.url).searchParams.get("season"));
  const streaks = await getTeamStreaks(userId, season);
  return NextResponse.json(streaks);
}
