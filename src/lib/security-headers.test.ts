import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("contentSecurityPolicy", () => {
  it("restricts default-src, frame-ancestors and object-src", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows the allowlisted image hosts", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("static.wikia.nocookie.net");
    expect(csp).toContain("dbdinfo.com");
  });

  it("only relaxes script/connect for local development", () => {
    const dev = contentSecurityPolicy(true);
    const prod = contentSecurityPolicy(false);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
  });
});

describe("securityHeaders", () => {
  it("includes the full hardening set", () => {
    const keys = securityHeaders(false).map((h) => h.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
  });

  it("sets HSTS with a long max-age, subdomains and preload", () => {
    const hsts = securityHeaders(false).find(
      (h) => h.key === "Strict-Transport-Security"
    );
    expect(hsts?.value).toContain("max-age=63072000");
    expect(hsts?.value).toContain("includeSubDomains");
    expect(hsts?.value).toContain("preload");
  });

  it("denies framing and MIME sniffing", () => {
    const byKey = Object.fromEntries(
      securityHeaders(false).map((h) => [h.key, h.value])
    );
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
