"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { useInvites } from "@/hooks/useInvites";

export function InviteBell() {
  const { invites, count, respondingId, accept, decline } = useInvites();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `${count} pending crew invites` : "Crew invites"}
          className="relative rounded-full p-2 text-gray-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-blood/60"
        >
          <Bell size={20} aria-hidden />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blood px-1 text-[10px] font-bold text-white"
            >
              {count}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[280px] rounded-lg border border-subtle bg-surface-2 p-1 shadow-xl shadow-black/50"
        >
          <div className="px-3 py-2 text-xs uppercase tracking-widest text-muted">Crew invites</div>
          <DropdownMenu.Separator className="my-1 h-px bg-subtle" />

          {invites.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">No pending invites.</p>
          ) : (
            <ul className="space-y-1">
              {invites.map((invite) => {
                const from = invite.invitedBy.nick || invite.invitedBy.name || "A player";
                const busy = respondingId === invite.id;
                return (
                  <li key={invite.id} className="rounded-md px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{invite.crew.name}</p>
                    <p className="truncate text-xs text-muted">Invited by {from}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => accept(invite.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blood py-1.5 text-xs font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decline(invite.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-subtle py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-50"
                      >
                        <X size={13} />
                        Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
