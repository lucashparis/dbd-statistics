import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Test-only helper: a fresh QueryClient per call so caches never leak between
// tests. Retries off (deterministic error paths); staleTime Infinity so a query
// seeded with initialData does not auto-refetch on mount — only explicit
// refetch/invalidation triggers a network call.
export function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, Wrapper };
}
