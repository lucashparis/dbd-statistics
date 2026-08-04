"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "@/components/molecules/PasswordInput";

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      if (res.status === 409) {
        toast.error("Email already registered");
        return;
      }
      if (!res.ok) {
        toast.error("Could not create account");
        return;
      }

      const login = await signIn("credentials", { email, password, redirect: false });
      if (!login || login.error) {
        toast.success("Account created — please sign in");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-widest text-muted">Name (optional)</span>
        <input name="name" type="text" autoComplete="name" className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-widest text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <PasswordInput name="password" label="Password" required minLength={4} autoComplete="new-password" />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
