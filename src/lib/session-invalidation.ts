// A JWT is stale once the account's password has changed after the token was
// issued — the whole point of tracking `passwordChangedAt` is to force every
// session open before a reset to log in again. `iat` is seconds since epoch
// (JWT convention); `passwordChangedAt` is a Date, hence the /1000.
export function isTokenStale(
  tokenIat: number | undefined,
  passwordChangedAt: Date | null | undefined
): boolean {
  if (!passwordChangedAt || typeof tokenIat !== "number") return false;
  return passwordChangedAt.getTime() / 1000 > tokenIat;
}
