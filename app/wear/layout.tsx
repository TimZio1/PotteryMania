import type { ReactNode } from "react";
import { WearLayoutShell } from "@/components/wear/wear-layout-shell";

export default function WearLayout({ children }: { children: ReactNode }) {
  return <WearLayoutShell>{children}</WearLayoutShell>;
}
