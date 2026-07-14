"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X, Trash2 } from "lucide-react";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { Button } from "@/components/atoms/Button";
import { computeStats } from "@/lib/utils";
import type { Killer, KillerStats } from "@/types/killer";
import type { Survivor } from "@/types/survivor";
import type { MyProfile, ProfileInput } from "@/types/profile";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MyProfile | null;
  onSave: (input: ProfileInput) => Promise<boolean>;
  saving: boolean;
  onRemove: () => Promise<void>;
  removing: boolean;
}

async function fetchKillerOptions(): Promise<KillerStats[]> {
  const res = await fetch("/api/killers");
  if (!res.ok) throw new Error("Failed to load killers");
  const killers = (await res.json()) as Killer[];
  return killers.map(computeStats);
}

async function fetchSurvivorOptions(): Promise<Survivor[]> {
  const res = await fetch("/api/survivors");
  if (!res.ok) throw new Error("Failed to load survivors");
  return (await res.json()) as Survivor[];
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60";
const labelClass = "block text-xs uppercase tracking-widest text-muted";

interface ProfileFormProps {
  profile: MyProfile | null;
  onSave: (input: ProfileInput) => Promise<boolean>;
  saving: boolean;
  onRemove: () => Promise<void>;
  removing: boolean;
  onClose: () => void;
}

function ProfileForm({ profile, onSave, saving, onRemove, removing, onClose }: ProfileFormProps) {
  const { data: killers = [] } = useQuery({
    queryKey: ["killer-options"],
    queryFn: fetchKillerOptions,
  });
  const { data: survivors = [] } = useQuery({
    queryKey: ["survivor-options"],
    queryFn: fetchSurvivorOptions,
  });
  const killerAutocomplete = useAutocomplete(killers);
  const survivorAutocomplete = useAutocomplete(survivors);

  const [name, setName] = React.useState(() => profile?.name ?? "");
  const [nick, setNick] = React.useState(() => profile?.nick ?? "");
  const [channelUrl, setChannelUrl] = React.useState(() => profile?.channelUrl ?? "");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile?.mainKiller || killers.length === 0) return;
    const match = killers.find((k) => k.id === profile.mainKiller?.id);
    if (match) killerAutocomplete.select(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.mainKiller?.id, killers.length]);

  React.useEffect(() => {
    if (!profile?.mainSurv || survivors.length === 0) return;
    const match = survivors.find((s) => s.id === profile.mainSurv?.id);
    if (match) survivorAutocomplete.select(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.mainSurv?.id, survivors.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNick = nick.trim();
    const trimmedUrl = channelUrl.trim();
    if (!trimmedNick) {
      setError("Nick is required.");
      return;
    }
    if (trimmedUrl && !isHttpsUrl(trimmedUrl)) {
      setError("Channel link must be a valid https URL.");
      return;
    }
    const ok = await onSave({
      name: name.trim() || undefined,
      nick: trimmedNick,
      channelUrl: trimmedUrl || null,
      mainKillerId: killerAutocomplete.selected?.id ?? null,
      mainSurvId: survivorAutocomplete.selected?.id ?? null,
    });
    if (ok) onClose();
  }

  async function handleRemove() {
    await onRemove();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="profile-name" className={labelClass}>
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your display name"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-nick" className={labelClass}>
          Nick <span className="text-blood">*</span>
        </label>
        <input
          id="profile-nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={40}
          required
          placeholder="In-game nick"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <span className={labelClass}>Main killer</span>
        <EntityAutocomplete
          {...killerAutocomplete}
          placeholder="Search your main killer..."
          searchLabel="Search killers"
          suggestionsLabel="Killer suggestions"
          notFoundLabel="No killers found for"
        />
      </div>

      <div className="space-y-1.5">
        <span className={labelClass}>Main survivor</span>
        <EntityAutocomplete
          {...survivorAutocomplete}
          placeholder="Search your main survivor..."
          searchLabel="Search survivors"
          suggestionsLabel="Survivor suggestions"
          notFoundLabel="No survivors found for"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-channel" className={labelClass}>
          Channel link
        </label>
        <input
          id="profile-channel"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          inputMode="url"
          maxLength={300}
          placeholder="https://twitch.tv/you"
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-blood">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        {profile?.isPublic ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-blood disabled:opacity-50"
          >
            <Trash2 size={14} />
            Remove profile
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  saving,
  onRemove,
  removing,
}: ProfileDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-subtle bg-surface p-6 shadow-2xl shadow-black/60 scrollbar-dark">
          <div className="mb-1 flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-bold uppercase tracking-widest text-white">
              Your profile
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-5 text-xs text-muted">
            Saving your profile makes your nick, channel link and statistics visible to the
            community. Remove it anytime to go private again.
          </Dialog.Description>

          <ProfileForm
            profile={profile}
            onSave={onSave}
            saving={saving}
            onRemove={onRemove}
            removing={removing}
            onClose={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
