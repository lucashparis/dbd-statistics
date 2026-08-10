// Shared by the server (403 body) and the client (warning toast). Kept free of
// Prisma/sonner imports so both runtimes can import it.
//
// Copy is intentionally Portuguese — the product owner specified these exact
// strings for the moderation warning.
export const BAN_TITLE = "Usuário em Ban List";
export const BAN_DESCRIPTION = "Comportamento suspeito/indequado";
export const BAN_CODE = "BANNED";

export class BannedError extends Error {
  constructor() {
    super(BAN_TITLE);
    this.name = "BannedError";
  }
}

export function isBannedError(error: unknown): boolean {
  return error instanceof BannedError;
}

// A blocked write answers `403 { code: "BANNED" }`. Every client fetch runs the
// response through this so the ban warning wins over the generic error toast.
export async function throwIfBanned(res: Response): Promise<void> {
  if (res.status !== 403) return;
  const body = await res
    .clone()
    .json()
    .catch(() => null);
  if (body && typeof body === "object" && (body as { code?: string }).code === BAN_CODE) {
    throw new BannedError();
  }
}
