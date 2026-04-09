import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";

/** Thrown from authorize so the client can show a specific message (code in Auth.js JSON error URL). */
class AccountSuspendedSignin extends CredentialsSignin {
  code = "suspended";
}

/**
 * Auth.js rejects empty/whitespace secrets (`!secret?.length` → 500 on /api/auth/session).
 * Use `||` so `AUTH_SECRET=""` still falls through to `NEXTAUTH_SECRET`; trim stray spaces from hosting UIs.
 */
const configuredAuthSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  undefined;

if (!configuredAuthSecret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be configured in production");
}

const authSecret = configuredAuthSecret || "dev-only-auth-secret-change-me";

const googleId = process.env.AUTH_GOOGLE_ID?.trim();
const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim();

const providers = [
  ...(googleId && googleSecret
    ? [
        Google({
          clientId: googleId,
          clientSecret: googleSecret,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
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
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: authSecret,
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = typeof profile?.email === "string" ? profile.email.toLowerCase().trim() : "";
      if (!email) return false;
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { suspendedAt: true },
      });
      if (existing?.suspendedAt) return "/login?reason=suspended";
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session: updatePayload }) {
      if (account?.provider === "google") {
        const email =
          (typeof user?.email === "string" && user.email) ||
          (typeof profile?.email === "string" && profile.email) ||
          "";
        if (email) {
          const dbUser = await prisma.user.upsert({
            where: { email: email.toLowerCase().trim() },
            update: {
              lastLoginAt: new Date(),
              emailVerifiedAt: new Date(),
            },
            create: {
              email: email.toLowerCase().trim(),
              role: "customer",
              lastLoginAt: new Date(),
              emailVerifiedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              role: true,
              suspendedAt: true,
              emailVerifiedAt: true,
            },
          });
          token.sub = dbUser.id;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.suspended = Boolean(dbUser.suspendedAt);
          token.emailVerified = Boolean(dbUser.emailVerifiedAt);
        }
      }

      if (trigger === "update" && updatePayload && typeof updatePayload === "object") {
        const payload = updatePayload as Record<string, unknown>;
        if (payload.endImpersonation === true && typeof token.impersonatorSub === "string") {
          const adminId = token.impersonatorSub;
          const targetUserId = typeof token.sub === "string" ? token.sub : null;
          token.sub = token.impersonatorSub;
          delete token.impersonatorSub;
          delete token.impersonatorEmail;
          if (targetUserId) {
            void logAdminAction({
              actorUserId: adminId,
              action: "user.impersonate_end",
              entityType: "user",
              entityId: targetUserId,
              after: { targetUserId },
              reason: null,
            });
          }
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
              void logAdminAction({
                actorUserId: grant.adminUserId,
                action: "user.impersonate_consumed",
                entityType: "user",
                entityId: grant.targetUserId,
                after: { targetUserId: grant.targetUserId, grantId: grant.id },
                reason: null,
              });
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