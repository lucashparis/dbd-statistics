import { prisma } from "@/lib/prisma";
import type { Team } from "@/types/team";

interface TeamRow {
  id: number;
  name: string;
  createdAt: Date;
  members: { player: { id: number; name: string; nick: string } }[];
}

export function serializeTeam(team: TeamRow): Team {
  return {
    id: team.id,
    name: team.name,
    createdAt: team.createdAt.toISOString(),
    members: team.members.map((m) => ({
      id: m.player.id,
      name: m.player.name,
      nick: m.player.nick,
    })),
  };
}

export async function getTeamsForUser(userId: string): Promise<Team[]> {
  const teams = await prisma.team.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { members: { include: { player: true } } },
  });
  return teams.map(serializeTeam);
}
