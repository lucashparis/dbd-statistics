"use client";

import { toast } from "sonner";
import { BAN_DESCRIPTION, BAN_TITLE, isBannedError } from "@/lib/ban-message";

export function notifyBanned(): void {
  toast.warning(BAN_TITLE, { description: BAN_DESCRIPTION });
}

// Every blocked write ends here: a ban shows the moderation warning, anything
// else falls back to the mutation's own error copy.
export function notifyMutationError(error: unknown, fallback: string): void {
  if (isBannedError(error)) {
    notifyBanned();
    return;
  }
  toast.error(error instanceof Error ? error.message : fallback);
}
