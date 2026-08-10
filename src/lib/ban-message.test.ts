import { describe, it, expect } from "vitest";
import {
  BAN_CODE,
  BAN_DESCRIPTION,
  BAN_TITLE,
  BannedError,
  isBannedError,
  throwIfBanned,
} from "@/lib/ban-message";

function res(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("throwIfBanned", () => {
  it("throws a BannedError on a 403 carrying the ban code", async () => {
    await expect(throwIfBanned(res(403, { code: BAN_CODE }))).rejects.toBeInstanceOf(BannedError);
  });

  it("ignores a 403 that is not a ban", async () => {
    await expect(throwIfBanned(res(403, { error: "Only the host can log" }))).resolves.toBeUndefined();
  });

  it("ignores a 403 with an unparseable body", async () => {
    await expect(throwIfBanned(new Response("nope", { status: 403 }))).resolves.toBeUndefined();
  });

  it("ignores non-403 responses", async () => {
    await expect(throwIfBanned(res(200, { code: BAN_CODE }))).resolves.toBeUndefined();
  });

  it("leaves the body readable for the caller", async () => {
    const response = res(403, { error: "nope" });
    await throwIfBanned(response);
    expect(await response.json()).toEqual({ error: "nope" });
  });
});

describe("isBannedError", () => {
  it("is true only for a BannedError", () => {
    expect(isBannedError(new BannedError())).toBe(true);
    expect(isBannedError(new Error(BAN_TITLE))).toBe(false);
    expect(isBannedError("banned")).toBe(false);
  });
});

describe("copy", () => {
  it("keeps the moderation strings the product specified", () => {
    expect(BAN_TITLE).toBe("Usuário em Ban List");
    expect(BAN_DESCRIPTION).toBe("Comportamento suspeito/indequado");
  });
});
