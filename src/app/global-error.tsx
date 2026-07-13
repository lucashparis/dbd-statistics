"use client";

import { Skull } from "lucide-react";

// global-error replaces the root layout, so globals.css / Tailwind tokens are
// not guaranteed to be applied here. Styles are inlined so this last-resort
// boundary renders correctly even when the app shell itself failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          backgroundColor: "#0A0A0A",
          color: "#e5e5e7",
          fontFamily: "sans-serif",
        }}
      >
        <main
          style={{
            display: "flex",
            minHeight: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <Skull size={40} color="#DC143C" />
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "#8e8e93" }}>
            A critical error occurred. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#636366" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid #DC143C",
              backgroundColor: "#DC143C",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#fff",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
