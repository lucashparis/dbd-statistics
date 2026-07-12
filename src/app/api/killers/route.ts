import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKillersForUser } from "@/lib/killers";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const killers = await getKillersForUser(session.user.id);
    return NextResponse.json(killers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch killers" }, { status: 500 });
  }
}
