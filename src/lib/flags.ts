// Collaborative crews replace the legacy single-user team/streak UI. The flag
// lets us roll back to the legacy templates without a schema redeploy — set
// NEXT_PUBLIC_CREWS_ENABLED="false" to fall back. Default: crews on.
export const crewsEnabled = process.env.NEXT_PUBLIC_CREWS_ENABLED !== "false";
