import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth-session";
import type { UserRole } from "@prisma/client";
import { ui } from "@/lib/ui-styles";
import { SessionRefreshActions } from "./session-refresh";

export const dynamic = "force-dynamic";

export default async function UnauthorizedAdminPage() {
  const session = await auth();
  const id = session?.user?.id;
  let email: string | null = null;
  let role: UserRole | null = null;
  if (id) {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { email: true, role: true },
    });
    email = row?.email ?? null;
    role = row?.role ?? null;
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-amber-950">Admin access required</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          The hyperadmin panel at <code className="rounded bg-stone-100 px-1">/admin</code> is only available to accounts
          whose role in the database is <strong>admin</strong> or <strong>hyper_admin</strong>. Registration and normal
          sign-up default to customer or vendor, not admin.
        </p>
        {id && email ? (
          <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-stone-800">
            You are signed in as <span className="font-medium">{email}</span> with role{" "}
            <span className="font-mono text-xs">{role ?? "unknown"}</span>.
            {role && isAdminRole(role) ? (
              <>
                {" "}
                If you still cannot open <code className="rounded bg-white px-1">/admin</code>, try signing out and
                signing in again, then contact support if it persists.
              </>
            ) : (
              <> Ask your project owner to update your role in the database, or use an admin account.</>
            )}
          </p>
        ) : (
          <p className="mt-4 text-sm text-stone-600">
            <Link href="/login?callbackUrl=/admin" className="font-medium text-amber-900 underline underline-offset-2">
              Sign in
            </Link>{" "}
            with an admin-capable account.
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/" className={`${ui.buttonSecondary} inline-flex justify-center`}>
            Back to home
          </Link>
          {id ? (
            <Link href="/dashboard" className={`${ui.buttonGhost} inline-flex justify-center`}>
              Dashboard
            </Link>
          ) : null}
        </div>
        {id ? (
          <div className="mt-4">
            <p className="text-xs text-stone-500">
              If your role was just updated in the database, sign out once so your session picks it up everywhere.
            </p>
            <SessionRefreshActions />
          </div>
        ) : null}
        <p className="mt-8 text-xs leading-6 text-stone-500">
          Local / self-hosted: run{" "}
          <code className="rounded bg-stone-100 px-1 text-[11px]">
            UPDATE users SET role = &apos;hyper_admin&apos; WHERE email = &apos;you@example.com&apos;;
          </code>{" "}
          (Postgres), then open <code className="rounded bg-stone-100 px-1">/admin</code> again.
        </p>
      </div>
    </div>
  );
}
