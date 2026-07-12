import Link from "next/link";
import { redirect } from "next/navigation";
import { Skull } from "lucide-react";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(220,20,60,0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 125%, rgba(0,0,0,0.85), transparent 55%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <div className="player-avatar-ring flex h-24 w-24 animate-fade-in-up items-center justify-center rounded-full bg-surface">
          <Skull size={44} className="text-blood" />
        </div>

        <div className="space-y-3">
          <p
            className="animate-fade-in-up font-display text-xs uppercase tracking-[0.4em] text-muted"
            style={{ animationDelay: "80ms" }}
          >
            Dead by Daylight
          </p>
          <h1
            className="animate-fade-in-up font-display text-5xl font-bold uppercase tracking-widest text-white glow-blood-text sm:text-6xl"
            style={{ animationDelay: "160ms" }}
          >
            Killer Tracker
          </h1>
          <p
            className="animate-fade-in-up mx-auto max-w-md text-sm tracking-wide text-muted"
            style={{ animationDelay: "240ms" }}
          >
            Log your trials. Chase the streak. One loss and it all begins again.
          </p>
        </div>

        <Link
          href="/login"
          className="animate-fade-in-up mt-2 inline-flex items-center gap-2 rounded-md bg-blood px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-blood-dark hover:shadow-[0_0_24px_rgba(220,20,60,0.5)]"
          style={{ animationDelay: "340ms" }}
        >
          Enter the Fog
        </Link>
      </div>

      <p
        className="animate-fade-in-up absolute bottom-6 text-[10px] uppercase tracking-[0.3em] text-muted/60"
        style={{ animationDelay: "500ms" }}
      >
        Survivors of The Fog
      </p>
    </main>
  );
}
