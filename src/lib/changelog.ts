import type { ChangelogEntry } from "@/types/changelog";

const ENTRIES: ChangelogEntry[] = [
  {
    id: "password-reset",
    feature: "Password reset",
    date: "2026-08-04",
    description:
      "Forgot your password? Request a reset link from the login page and set a new password by email — no need to contact support. Resetting your password signs you out of every other device.",
    requestedBy: "Community",
  },
  {
    id: "seasons",
    feature: "Seasons",
    date: "2026-07-24",
    description:
      "Your stats are now split into 3-month seasons, starting July 15, 2026. Switch seasons from the header to see the killer grid, statistics, streaks, crews, history, community and rank for that period — or pick All time for your full record. Everything you played before July 15, 2026 lives in Season 0, and your choice is remembered across devices.",
    requestedBy: "Community",
  },
  {
    id: "killer-mode",
    feature: "Killer mode",
    date: "2026-07-23",
    description:
      "Switch between Survivor and Killer perspectives from the header. Killer mode tracks the games you play as the killer — with its own killer grid, community, rank, statistics and history — completely separate from your survivor stats. Your choice is remembered across devices.",
    requestedBy: "Community",
  },
  {
    id: "shared-crew-streaks",
    feature: "Shared crew streaks",
    date: "2026-07-22",
    description:
      "Team up with real players in a crew and grow one shared win streak. Invite up to three members by their community nick, log matches together, and every game counts toward each member's stats.",
    requestedBy: "Community",
  },
  {
    id: "main-survivor",
    feature: "Main survivor on profile",
    date: "2026-07-14",
    description:
      "Show your main survivor alongside your main killer on your public profile.",
    requestedBy: "Community",
  },
  {
    id: "community-profiles",
    feature: "Community profiles",
    date: "2026-07-14",
    description:
      "Publish an opt-in public profile and discover other players in the Community tab.",
    requestedBy: "Community",
  },
  {
    id: "team-streaks",
    feature: "Team streaks",
    date: "2026-07-12",
    description: "Launch and follow win streaks for a whole team.",
    requestedBy: "Community",
  },
  {
    id: "win-streaks",
    feature: "Win streaks",
    date: "2026-07-04",
    description:
      "Track your current and best win streaks, globally and per killer.",
    requestedBy: "Community",
  },
  {
    id: "statistics-charts",
    feature: "Statistics & pie chart",
    date: "2026-05-08",
    description:
      "Visualize your performance with a win-rate breakdown and a killer ranking.",
    requestedBy: "Community",
  },
  {
    id: "match-history",
    feature: "Match history",
    date: "2026-04-30",
    description: "Browse a paginated timeline of every recorded match.",
    requestedBy: "Community",
  },
  {
    id: "teams-and-players",
    feature: "Teams & players",
    date: "2026-04-29",
    description:
      "Build a roster of players and teams to track who you play with.",
    requestedBy: "Community",
  },
  {
    id: "undo-results",
    feature: "Undo a result",
    date: "2026-04-29",
    description:
      "Made a mistake? Instantly undo your last recorded win or loss.",
    requestedBy: "Community",
  },
  {
    id: "win-loss-tracker",
    feature: "Killer win/loss tracker",
    date: "2026-04-27",
    description:
      "Record wins and losses per killer and see your totals and win rate at a glance.",
    requestedBy: "Community",
  },
];

export function getChangelogEntries(): ChangelogEntry[] {
  return [...ENTRIES].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatChangelogDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
