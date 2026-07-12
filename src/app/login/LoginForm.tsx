"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (!res || res.error) {
      toast.error("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-widest text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-widest text-muted">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-60"
      >
        {loading ? "Entering…" : "Enter"}
      </button>
    </form>
  );
}
