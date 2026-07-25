import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStreaksForUser } from "@/lib/streak";
import { parseSeason } from "@/lib/api";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const season = parseSeason(new URL(req.url).searchParams.get("season"));
    const payload = await getStreaksForUser(session.user.id, season);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("streaks route failed", e);
    return NextResponse.json(
      { error: "Failed to fetch streaks" },
      { status: 500 }
    );
  }
}
