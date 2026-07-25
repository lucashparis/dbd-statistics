import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKillersForUser } from "@/lib/killers";
import { parsePerspective, parseSeason } from "@/lib/api";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = new URL(req.url).searchParams;
    const perspective = parsePerspective(sp.get("perspective"));
    const season = parseSeason(sp.get("season"));
    const killers = await getKillersForUser(session.user.id, perspective, season);
    return NextResponse.json(killers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch killers" }, { status: 500 });
  }
}
