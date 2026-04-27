import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const killers = await prisma.killer.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(killers);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch killers" },
      { status: 500 }
    );
  }
}
