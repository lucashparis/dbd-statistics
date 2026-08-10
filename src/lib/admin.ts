import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin === true;
}

type AdminGuard = { userId: string; response?: never } | { userId?: never; response: NextResponse };

// Auth then authorization, in that order: an anonymous caller gets 401, a signed
// in non-admin gets 404 so the admin surface is not discoverable.
export async function requireAdmin(): Promise<AdminGuard> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await isAdmin(userId))) {
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { userId };
}
