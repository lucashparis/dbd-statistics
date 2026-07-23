import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKillersForUser } from "@/lib/killers";
import { parsePerspective } from "@/lib/api";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const perspective = parsePerspective(new URL(req.url).searchParams.get("perspective"));
    const killers = await getKillersForUser(session.user.id, perspective);
    return NextResponse.json(killers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch killers" }, { status: 500 });
  }
}
