/**
 * Grants or revokes admin access (the Ban list tab). There is no route that can
 * promote an account — bootstrapping happens here.
 *
 *   npx tsx scripts/set-admin.ts --email=lucas@reufy.com.br
 *   npx tsx scripts/set-admin.ts --email=lucas@reufy.com.br --revoke
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const email = flag("email");
const isAdmin = !process.argv.includes("--revoke");

async function main() {
  if (!email) throw new Error("Missing --email=<account email>");

  const user = await prisma.user.update({
    where: { email },
    data: { isAdmin },
    select: { id: true, email: true, isAdmin: true },
  });
  console.log(`${user.email} → isAdmin=${user.isAdmin}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
