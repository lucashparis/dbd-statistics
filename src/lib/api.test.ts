import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { parseId, parsePage, mutationError } from "./api";

describe("parseId", () => {
  it("parses positive integers", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("999")).toBe(999);
  });

  it("rejects non-numbers, zero, negatives and decimals", () => {
    expect(parseId("abc")).toBeNull();
    expect(parseId("0")).toBeNull();
    expect(parseId("-3")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId("")).toBeNull();
  });
});

describe("parsePage", () => {
  it("returns the page number for valid input", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("10")).toBe(10);
  });

  it.each(["abc", "-3", "0", "", "NaN", null])(
    "falls back to page 1 for invalid input %j",
    (value) => {
      expect(parsePage(value as string | null)).toBe(1);
    }
  );
});

describe("mutationError", () => {
  it("maps foreign-key / not-found Prisma errors to 404", () => {
    const fk = new Prisma.PrismaClientKnownRequestError("fk", {
      code: "P2003",
      clientVersion: "5",
    });
    const notFound = new Prisma.PrismaClientKnownRequestError("nf", {
      code: "P2025",
      clientVersion: "5",
    });
    expect(mutationError("ctx", fk).status).toBe(404);
    expect(mutationError("ctx", notFound).status).toBe(404);
  });

  it("maps any other error to 500 and logs it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(mutationError("ctx", new Error("boom")).status).toBe(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
