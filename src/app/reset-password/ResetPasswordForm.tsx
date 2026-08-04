"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "@/components/molecules/PasswordInput";

interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [invalid, setInvalid] = React.useState(!token);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.status === 400) {
        setInvalid(true);
        return;
      }
      if (!res.ok) {
        toast.error("Could not reset the password. Try again.");
        return;
      }

      const { email } = await res.json();
      const login = await signIn("credentials", { email, password, redirect: false });
      if (!login || login.error) {
        toast.success("Password updated — please sign in");
        router.push("/login");
        return;
      }
      toast.success("Password updated");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (invalid) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">This reset link is invalid or has expired.</p>
        <Link
          href="/forgot-password"
          className="text-sm text-blood transition-colors hover:text-blood-dark"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasswordInput name="password" label="New password" required minLength={4} autoComplete="new-password" />
      <PasswordInput
        name="confirmPassword"
        label="Confirm password"
        required
        minLength={4}
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-60"
      >
        {loading ? "Saving…" : "Reset password"}
      </button>
    </form>
  );
}
