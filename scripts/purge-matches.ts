/**
 * Removes match rows a moderator judged fake.
 *
 * Dry run by default — it prints exactly which rows it would delete and exits
 * without touching anything. Pass `--apply` to commit.
 *
 *   npx tsx scripts/purge-matches.ts --nick=menob7 --result=win --limit=20
 *   npx tsx scripts/purge-matches.ts --nick=menob7 --result=win --limit=20 --killer=Blight --apply
 *
 * Flags:
 *   --nick=<nick>          community nick of the target (required)
 *   --result=win|loss      filter by result (default: win)
 *   --killer=<name>        restrict to one killer (exact name)
 *   --perspective=survivor|killer
 *   --limit=<n>            delete at most N rows, newest first (default: 20)
 *   --apply                actually delete (otherwise dry run)
 *
 * Crew projections are never touched: deleting one side of a fanned-out
 * CrewMatch would desync the shared streak from the members' stats.
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const nick = flag("nick");
const result = flag("result") ?? "win";
const killerName = flag("killer");
const perspective = flag("perspective");
const limit = Number(flag("limit") ?? 20);
const apply = process.argv.includes("--apply");

async function main() {
  if (!nick) throw new Error("Missing --nick=<community nick>");
  if (result !== "win" && result !== "loss") throw new Error("--result must be win or loss");
  if (perspective && perspective !== "survivor" && perspective !== "killer") {
    throw new Error("--perspective must be survivor or killer");
  }
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit must be a positive integer");

  const profile = await prisma.profile.findFirst({
    where: { nick: { equals: nick, mode: "insensitive" } },
    select: { userId: true, nick: true },
  });
  if (!profile) throw new Error(`No community profile found for nick "${nick}"`);

  const where: Prisma.MatchWhereInput = {
    userId: profile.userId,
    result,
    crewMatchId: null,
    ...(perspective ? { perspective: perspective as "survivor" | "killer" } : {}),
    ...(killerName ? { killer: { name: killerName } } : {}),
  };

  const candidates = await prisma.match.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      result: true,
      perspective: true,
      createdAt: true,
      teamId: true,
      streakRunId: true,
      killer: { select: { name: true } },
    },
  });

  console.log(`\nTarget: ${profile.nick} (${profile.userId})`);
  console.log(
    `Filter: result=${result}` +
      (killerName ? ` killer=${killerName}` : "") +
      (perspective ? ` perspective=${perspective}` : " perspective=any") +
      ` limit=${limit} (crew projections excluded)\n`
  );
  console.log(`Matched ${candidates.length} row(s):`);
  for (const m of candidates) {
    console.log(
      `  #${m.id}  ${m.killer.name}  ${m.result}  ${m.perspective}  ${m.createdAt.toISOString()}` +
        (m.streakRunId ? `  [streakRun ${m.streakRunId}]` : "")
    );
  }

  if (candidates.length === 0) return;

  if (!apply) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply to commit.\n");
    return;
  }

  const { count } = await prisma.match.deleteMany({
    where: { id: { in: candidates.map((m) => m.id) } },
  });
  console.log(`\nDeleted ${count} row(s).`);
  console.log(
    "Reminder: the community/rank projections are cached for 60s and rebuild on the next read.\n"
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
