import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Set by the `jwt` callback in src/auth.ts when the account's password
    // changed after this token was issued — see src/lib/session-invalidation.ts.
    invalid?: boolean;
  }
}
