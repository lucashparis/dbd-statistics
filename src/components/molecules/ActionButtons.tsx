"use client";

import * as React from "react";
import { Sword, Skull, Undo2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

export const READ_ONLY_SEASON_HINT = "Past seasons are read-only";

interface ActionButtonsProps {
  killerId: number;
  loadingWin?: boolean;
  loadingLoss?: boolean;
  loadingUndoWin?: boolean;
  loadingUndoLoss?: boolean;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
  onUndoWin: (id: number) => void;
  onUndoLoss: (id: number) => void;
  // A match logged now always lands in the current season, so a past window
  // cannot accept writes.
  readOnly?: boolean;
}

export function ActionButtons({
  killerId,
  loadingWin = false,
  loadingLoss = false,
  loadingUndoWin = false,
  loadingUndoLoss = false,
  onWin,
  onLoss,
  onUndoWin,
  onUndoLoss,
  readOnly = false,
}: ActionButtonsProps) {
  const hint = readOnly ? READ_ONLY_SEASON_HINT : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        <Button
          variant="win"
          loading={loadingWin}
          disabled={readOnly}
          title={hint}
          onClick={() => onWin(killerId)}
          className="flex-1 text-xs"
          aria-label="Register win"
        >
          {!loadingWin && <Icon icon={Sword} size={12} />}
          Win
        </Button>
        <Button
          variant="loss"
          loading={loadingLoss}
          disabled={readOnly}
          title={hint}
          onClick={() => onLoss(killerId)}
          className="flex-1 text-xs"
          aria-label="Register loss"
        >
          {!loadingLoss && <Icon icon={Skull} size={12} />}
          Loss
        </Button>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          loading={loadingUndoWin}
          disabled={readOnly}
          title={hint}
          onClick={() => onUndoWin(killerId)}
          className="flex-1 py-1 text-xs text-emerald-600 hover:text-emerald-400"
          aria-label="Undo win"
        >
          {!loadingUndoWin && <Icon icon={Undo2} size={11} />}
          Undo Win
        </Button>
        <Button
          variant="ghost"
          loading={loadingUndoLoss}
          disabled={readOnly}
          title={hint}
          onClick={() => onUndoLoss(killerId)}
          className="flex-1 py-1 text-xs text-blood/70 hover:text-blood"
          aria-label="Undo loss"
        >
          {!loadingUndoLoss && <Icon icon={Undo2} size={11} />}
          Undo Loss
        </Button>
      </div>
    </div>
  );
}
