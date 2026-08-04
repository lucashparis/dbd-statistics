import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import authConfig from "@/auth.config";
import { verifyCredentials } from "@/lib/auth-credentials";
import { prisma } from "@/lib/prisma";
import { isTokenStale } from "@/lib/session-invalidation";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    // Node-only (needs Prisma) — deliberately not in auth.config.ts, which
    // stays edge-safe. Runs whenever a Node-runtime auth() call decodes the
    // session (every protected API route / Server Component).
    async jwt({ token }) {
      if (!token.sub) return token;
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true },
      });
      if (isTokenStale(token.iat, user?.passwordChangedAt)) {
        return { ...token, invalid: true };
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        return verifyCredentials(parsed.data.email, parsed.data.password);
      },
    }),
  ],
});
