import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSurvivors } from "@/lib/survivors";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const survivors = await getSurvivors();
    return NextResponse.json(survivors);
  } catch {
    return NextResponse.json({ error: "Failed to fetch survivors" }, { status: 500 });
  }
}
