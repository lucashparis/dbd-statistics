import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { seasonsEnabled } from "@/lib/flags";
import { isWritableSeason, parseSeasonParam, type SeasonSelection } from "@/lib/seasons";

const idSchema = z.coerce.number().int().positive();

export function parseId(value: string): number | null {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
}

const pageSchema = z.coerce.number().int().positive().catch(1);

export function parsePage(value: string | null): number {
  return pageSchema.parse(value ?? 1);
}

const perspectiveSchema = z.enum(["survivor", "killer"]).catch("survivor");

export function parsePerspective(value: string | null): "survivor" | "killer" {
  return perspectiveSchema.parse(value ?? "survivor");
}

// Coerces rather than 400s (same contract as `parsePerspective`): a missing or
// bogus value means "the current season", and a future season is clamped, so an
// older client that never sends the param still gets a coherent window.
export function parseSeason(value: string | null): SeasonSelection {
  if (!seasonsEnabled) return "all";
  return parseSeasonParam(value);
}

// A match is always created with `createdAt = now()`, so a write only makes
// sense while the current season (or all time) is selected. Rejecting it server
// side backs up the disabled UI: the client's optimistic patch would otherwise
// credit a window the match cannot land in.
export function readOnlySeason(season: SeasonSelection): NextResponse | null {
  if (isWritableSeason(season)) return null;
  return NextResponse.json({ error: "Past seasons are read-only" }, { status: 409 });
}

export function mutationError(context: string, e: unknown): NextResponse {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P2003" || e.code === "P2025")
  ) {
    return NextResponse.json({ error: "Killer not found" }, { status: 404 });
  }
  console.error(`${context} failed`, e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
