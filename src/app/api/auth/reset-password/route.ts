import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/auth-credentials";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(4),
});

function invalidTokenResponse() {
  return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      return invalidTokenResponse();
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash, passwordChangedAt: now },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
    ]);

    // Returned so the client can sign in immediately without retyping the
    // email — safe here because the caller already proved single-use token
    // possession for this exact account.
    return NextResponse.json({ ok: true, email: updatedUser.email });
  } catch (e) {
    console.error("reset-password failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
