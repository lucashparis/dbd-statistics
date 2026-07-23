// Collaborative crews replace the legacy single-user team/streak UI. The flag
// lets us roll back to the legacy templates without a schema redeploy — set
// NEXT_PUBLIC_CREWS_ENABLED="false" to fall back. Default: crews on.
export const crewsEnabled = process.env.NEXT_PUBLIC_CREWS_ENABLED !== "false";

// Killer-perspective mode (Surv/Killer toggle). When off, the app operates
// survivor-only and the toggle is hidden — a UI rollback with no schema change.
// Default: on.
export const killerModeEnabled = process.env.NEXT_PUBLIC_KILLER_MODE_ENABLED !== "false";
