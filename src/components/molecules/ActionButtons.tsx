"use client";

import * as React from "react";
import { Sword, Skull } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";

interface ActionButtonsProps {
  killerId: number;
  loadingWin?: boolean;
  loadingLoss?: boolean;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
}

export function ActionButtons({
  killerId,
  loadingWin = false,
  loadingLoss = false,
  onWin,
  onLoss,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
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
        variant="loss"
        loading={loadingLoss}
        onClick={() => onLoss(killerId)}
        className="flex-1 text-xs"
        aria-label="Register loss"
      >
        {!loadingLoss && <Icon icon={Skull} size={12} />}
        Loss
      </Button>
    </div>
  );
}
