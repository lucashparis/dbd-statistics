import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_EMAIL = "francielidesouza78@gmail.com";
const DEFAULT_NAME = "Francieli";

// Synthetic reconciliation matches (the counter-only gap) get a fixed historical
// date so they land at the bottom of the timeline instead of appearing as the
// most recent matches (they never had a real per-match timestamp).
const SYNTHETIC_DATE = new Date("2026-01-01T00:00:00.000Z");

// One-off Phase 2 migration: move the pre-auth global ledger to the default user.
// Idempotent — the reconciliation target is the legacy Killer.wins/losses counter,
// so re-running never duplicates. Must run BEFORE dropping Killer.wins/losses.
//
// The counters are read via raw SQL (not the Prisma model) so this keeps working
// after the columns are removed from schema.prisma / the generated client.
async function main() {
  console.log("🩸 Phase 2 migration starting...");

  const password = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD ?? "2003", 10);
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: { email: DEFAULT_EMAIL, name: DEFAULT_NAME, password },
  });
  console.log(`Default user: ${user.email} (${user.id})`);

  // 1. Adopt every ownerless match.
  const adopted = await prisma.match.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log(`Adopted ${adopted.count} existing matches.`);

  // 2. Reconcile the ledger to match the legacy counters (survivor perspective).
  const counters = await prisma.$queryRaw<
    { id: number; wins: number; losses: number }[]
  >`SELECT id, wins, losses FROM "Killer"`;

  let generated = 0;
  for (const k of counters) {
    for (const result of ["win", "loss"] as const) {
      const target = result === "win" ? Number(k.wins) : Number(k.losses);
      const current = await prisma.match.count({
        where: { userId: user.id, killerId: k.id, result },
      });
      const diff = target - current;
      if (diff > 0) {
        await prisma.match.createMany({
          data: Array.from({ length: diff }, () => ({
            userId: user.id,
            killerId: k.id,
            result,
            teamId: null,
            createdAt: SYNTHETIC_DATE,
          })),
        });
        generated += diff;
      } else if (diff < 0) {
        console.warn(
          `⚠ killer ${k.id} ${result}: ledger (${current}) exceeds counter (${target}) by ${-diff} — left as-is`
        );
      }
    }
  }
  console.log(`Generated ${generated} synthetic matches to reconcile counters.`);

  const wins = await prisma.match.count({ where: { userId: user.id, result: "win" } });
  const losses = await prisma.match.count({ where: { userId: user.id, result: "loss" } });
  console.log(`✅ Default user ledger: ${wins} wins / ${losses} losses / ${wins + losses} total`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
