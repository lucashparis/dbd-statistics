import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared by middleware and the full auth.ts.
// No Prisma/bcrypt here — those live in auth.ts (Node runtime only).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      // `invalid` is set by the Node-only `jwt` callback in src/auth.ts once
      // the account's password changed after this token was issued. Dropping
      // `session.user` here is what makes every existing `if (!session?.user)`
      // 401 check reject a stale token without touching any route.
      if (token.invalid) return { ...session, user: undefined } as unknown as typeof session;
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
