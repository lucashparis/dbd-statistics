import crypto from "crypto";

export const TOKEN_TTL_MS = 60 * 60 * 1000;

export interface GeneratedResetToken {
  raw: string;
  hash: string;
  expiresAt: Date;
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateResetToken(): GeneratedResetToken {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  };
}
