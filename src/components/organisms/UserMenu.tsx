"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Pencil, User, LogOut } from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { ProfileDialog } from "@/components/organisms/ProfileDialog";
import { useProfile } from "@/hooks/useProfile";

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-white";

export function UserMenu() {
  const { data: session } = useSession();
  const { profile, saveProfile, saving, removeProfile, removing } = useProfile();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const email = session?.user?.email ?? "";
  const label = profile?.name?.trim() || profile?.nick || email || "";
  const userId = session?.user?.id;

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Open user menu"
            className="rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-blood/60"
          >
            <Avatar imageUrl={profile?.mainKiller?.imageUrl} label={label} size="md" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[210px] rounded-lg border border-subtle bg-surface-2 p-1 shadow-xl shadow-black/50"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-white">
                {profile?.name?.trim() || profile?.nick || "Player"}
              </p>
              {email && <p className="truncate text-xs text-muted">{email}</p>}
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-subtle" />

            <DropdownMenu.Item className={itemClass} onSelect={() => setDialogOpen(true)}>
              <Pencil size={14} aria-hidden />
              Edit profile
            </DropdownMenu.Item>

            {profile?.isPublic && userId && (
              <DropdownMenu.Item asChild className={itemClass}>
                <Link href={`/community/${userId}`}>
                  <User size={14} aria-hidden />
                  My public profile
                </Link>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className="my-1 h-px bg-subtle" />

            <DropdownMenu.Item
              className={itemClass}
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} aria-hidden />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        onSave={saveProfile}
        saving={saving}
        onRemove={removeProfile}
        removing={removing}
      />
    </>
  );
}
