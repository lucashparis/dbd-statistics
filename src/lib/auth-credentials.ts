import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) return null;

  return { id: user.id, email: user.email, name: user.name };
}
