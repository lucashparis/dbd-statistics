"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1.5 rounded-md border border-subtle px-3 py-1.5 text-xs text-muted transition-colors hover:border-blood hover:text-blood"
    >
      <LogOut size={14} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
