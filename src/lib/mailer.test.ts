import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "@/lib/mailer";

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn() },
}));

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"] as const;
const originalEnv: Record<string, string | undefined> = {};

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    process.env.SMTP_FROM = "DBD Statistics <no-reply@example.com>";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("sends an email with the reset link in the body", async () => {
    const sendMail = vi.fn().mockResolvedValueOnce(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValueOnce({ sendMail } as never);

    await sendPasswordResetEmail("a@b.com", "https://app.example.com/reset-password?token=xyz");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("a@b.com");
    expect(call.from).toBe("DBD Statistics <no-reply@example.com>");
    expect(call.text).toContain("https://app.example.com/reset-password?token=xyz");
  });

  it("throws when SMTP_FROM is missing", async () => {
    delete process.env.SMTP_FROM;
    await expect(sendPasswordResetEmail("a@b.com", "https://x/y")).rejects.toThrow(
      "SMTP_FROM is not configured"
    );
  });

  it("throws when SMTP_HOST is missing", async () => {
    delete process.env.SMTP_HOST;
    await expect(sendPasswordResetEmail("a@b.com", "https://x/y")).rejects.toThrow(
      "SMTP_HOST is not configured"
    );
  });
});
