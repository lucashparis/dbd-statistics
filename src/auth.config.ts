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
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
