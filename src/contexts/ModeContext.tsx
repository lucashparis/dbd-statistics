"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Perspective } from "@/types/killer";

interface ModeContextValue {
  mode: Perspective;
  setMode: (mode: Perspective) => void;
}

const ModeContext = React.createContext<ModeContextValue | null>(null);

export function ModeProvider({
  initialMode,
  children,
}: {
  initialMode: Perspective;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = React.useState<Perspective>(initialMode);

  function setMode(next: Perspective) {
    if (next === mode) return;
    const previous = mode;
    setModeState(next);
    fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save mode");
      })
      .catch(() => {
        setModeState(previous);
        toast.error("Could not switch mode");
      });
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = React.useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
