import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { enforceRateLimit } from "@/lib/rate-limit";

const { auth } = NextAuth(authConfig);

// Next.js 16 "proxy" (formerly middleware).
// - Protects /dashboard: unauthenticated requests are redirected to /login.
// - Rate-limits write requests to /api (per user when signed in, else per IP).
//   Reads (GET/HEAD) are not limited. Rate limiting is a no-op until the
//   Upstash env is configured (see src/lib/rate-limit.ts).
export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "anon";
      const identifier = req.auth?.user?.id ? `user:${req.auth.user.id}` : `ip:${ip}`;
      const limited = await enforceRateLimit(identifier);
      if (limited) return limited;
    }
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/community/:path*", "/changelog", "/api/:path*"],
};
