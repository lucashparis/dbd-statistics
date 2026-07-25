// Collaborative crews replace the legacy single-user team/streak UI. The flag
// lets us roll back to the legacy templates without a schema redeploy — set
// NEXT_PUBLIC_CREWS_ENABLED="false" to fall back. Default: crews on.
export const crewsEnabled = process.env.NEXT_PUBLIC_CREWS_ENABLED !== "false";

// Killer-perspective mode (Surv/Killer toggle). When off, the app operates
// survivor-only and the toggle is hidden — a UI rollback with no schema change.
// Default: on.
export const killerModeEnabled = process.env.NEXT_PUBLIC_KILLER_MODE_ENABLED !== "false";

// Season scoping (3-month windows over `createdAt`). When off, every read
// resolves to "all time" and the season selector is hidden — the pre-seasons
// behaviour, byte for byte, with no schema rollback needed. Default: on.
export const seasonsEnabled = process.env.NEXT_PUBLIC_SEASONS_ENABLED !== "false";
