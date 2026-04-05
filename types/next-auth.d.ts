import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      suspended?: boolean;
      emailVerified?: boolean;
      /** Set when an admin is viewing the app as another user (JWT `sub` is the target). */
      impersonatorId?: string;
      impersonatorEmail?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    suspended?: boolean;
    emailVerified?: boolean;
    /** Admin user id before switching `sub` to the impersonation target. */
    impersonatorSub?: string;
    impersonatorEmail?: string;
  }
}