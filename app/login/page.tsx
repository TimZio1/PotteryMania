import { Suspense } from "react";
import LoginInner from "./login-inner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}