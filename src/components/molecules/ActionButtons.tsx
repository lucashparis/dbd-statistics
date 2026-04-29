"use client";

import * as React from "react";
import { Sword, Skull, Undo2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

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
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <div className="flex flex-1 gap-1">
        <Button
          variant="win"
          loading={loadingWin}
          onClick={() => onWin(killerId)}
          className="flex-1 text-xs"
          aria-label="Register win"
        >
          {!loadingWin && <Icon icon={Sword} size={12} />}
          Win
        </Button>
        <Button
          variant="ghost"
          loading={loadingUndoWin}
          onClick={() => onUndoWin(killerId)}
          className="px-2 text-emerald-600 hover:text-emerald-400"
          aria-label="Undo win"
        >
          {!loadingUndoWin && <Icon icon={Undo2} size={12} />}
        </Button>
      </div>
      <div className="flex flex-1 gap-1">
        <Button
          variant="loss"
          loading={loadingLoss}
          onClick={() => onLoss(killerId)}
          className="flex-1 text-xs"
          aria-label="Register loss"
        >
          {!loadingLoss && <Icon icon={Skull} size={12} />}
          Loss
        </Button>
        <Button
          variant="ghost"
          loading={loadingUndoLoss}
          onClick={() => onUndoLoss(killerId)}
          className="px-2 text-blood/70 hover:text-blood"
          aria-label="Undo loss"
        >
          {!loadingUndoLoss && <Icon icon={Undo2} size={12} />}
        </Button>
      </div>
    </div>
  );
}
