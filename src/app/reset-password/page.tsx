import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await searchParams;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm card-dark p-8 space-y-6">
        <header className="text-center space-y-2">
          <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white uppercase glow-blood-text">
            Set a New Password
          </h1>
        </header>
        <ResetPasswordForm token={token ?? null} />
      </div>
    </main>
  );
}
