import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";

const forgotPasswordSchema = z.object({
  email: z.email(),
});

// Always returns the same 200 body regardless of whether the email is
// registered — a different response would let a caller enumerate accounts.
function genericResponse() {
  return NextResponse.json({ message: "If that email is registered, a reset link was sent." });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return genericResponse();

    const { raw, hash, expiresAt } = generateResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt },
      }),
    ]);

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return genericResponse();
  } catch (e) {
    console.error("forgot-password failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
