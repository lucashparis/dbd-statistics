"use client";

import * as React from "react";

// A timer derived from a value — useEffect is the right tool here (this is not a
// DOM measurement or subscription, so the ref-callback convention does not apply).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
