import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStreaksForUser } from "@/lib/streak";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getStreaksForUser(session.user.id);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("streaks route failed", e);
    return NextResponse.json(
      { error: "Failed to fetch streaks" },
      { status: 500 }
    );
  }
}
