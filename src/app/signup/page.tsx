import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm card-dark p-8 space-y-6">
        <header className="text-center space-y-2">
          <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white uppercase glow-blood-text">
            Join the Trial
          </h1>
        </header>
        <SignupForm />
        <p className="text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-blood transition-colors hover:text-blood-dark">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
