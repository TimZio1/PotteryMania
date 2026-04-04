import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Auth.js rejects empty/whitespace secrets (`!secret?.length` → 500 on /api/auth/session).
 * Use `||` so `AUTH_SECRET=""` still falls through to `NEXTAUTH_SECRET`; trim stray spaces from hosting UIs.
 */
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  ...(authSecret ? { secret: authSecret } : {}),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user?.passwordHash) return null;
        if (user.suspendedAt) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "role" in user) {
        token.role = (user as { role: string }).role;
      }
      // Keep JWT role aligned with DB (SQL promote / seed) so middleware + /admin stay consistent.
      if (token.sub) {
        const row = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, suspendedAt: true },
        });
        if (row?.role) token.role = row.role;
        token.suspended = Boolean(row?.suspendedAt);
      } else {
        token.suspended = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { suspended?: boolean }).suspended = Boolean(token.suspended);
      }
      return session;
    },
  },
});