import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

/** Thrown from authorize so the client can show a specific message (code in Auth.js JSON error URL). */
class AccountSuspendedSignin extends CredentialsSignin {
  code = "suspended";
}

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
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            suspendedAt: true,
            emailVerifiedAt: true,
          },
        });
        if (!user?.passwordHash) return null;
        if (user.suspendedAt) throw new AccountSuspendedSignin();
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
    async jwt({ token, user, trigger, session: updatePayload }) {
      if (trigger === "update" && updatePayload && typeof updatePayload === "object") {
        const payload = updatePayload as Record<string, unknown>;
        if (payload.endImpersonation === true && typeof token.impersonatorSub === "string") {
          token.sub = token.impersonatorSub;
          delete token.impersonatorSub;
          delete token.impersonatorEmail;
        } else if (typeof payload.impersonationGrantId === "string" && token.sub) {
          const grantId = payload.impersonationGrantId;
          try {
            const grant = await prisma.impersonationGrant.findUnique({ where: { id: grantId } });
            const now = new Date();
            if (grant && grant.adminUserId === token.sub && grant.expiresAt > now) {
              token.impersonatorSub = token.sub;
              token.impersonatorEmail = typeof token.email === "string" ? token.email : undefined;
              token.sub = grant.targetUserId;
              await prisma.impersonationGrant.delete({ where: { id: grant.id } });
            }
          } catch (e) {
            console.error("[auth jwt] impersonation grant failed", e);
          }
        }
      }

      if (user && "role" in user) {
        token.role = (user as { role: string }).role;
      }
      // Keep JWT role/email aligned with DB for current `sub` (handles impersonation target + admin promote).
      if (token.sub) {
        try {
          const row = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, suspendedAt: true, emailVerifiedAt: true, email: true },
          });
          if (row?.role) token.role = row.role;
          if (row?.email) token.email = row.email;
          token.suspended = Boolean(row?.suspendedAt);
          token.emailVerified = Boolean(row?.emailVerifiedAt);
        } catch (e) {
          console.error("[auth jwt] user refresh failed", e);
          if (user && "role" in user) {
            token.suspended = false;
          }
        }
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
        (session.user as { emailVerified?: boolean }).emailVerified = Boolean(token.emailVerified);
        const impSub = token.impersonatorSub;
        (session.user as { impersonatorId?: string }).impersonatorId =
          typeof impSub === "string" ? impSub : undefined;
        (session.user as { impersonatorEmail?: string }).impersonatorEmail =
          typeof token.impersonatorEmail === "string" ? token.impersonatorEmail : undefined;
      }
      return session;
    },
  },
});