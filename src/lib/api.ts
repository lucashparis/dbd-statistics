import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export function parseId(value: string): number | null {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
}

const pageSchema = z.coerce.number().int().positive().catch(1);

export function parsePage(value: string | null): number {
  return pageSchema.parse(value ?? 1);
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
