import type { CSSProperties, ReactNode } from "react";
import type { ResolvedStudioPublicTheme } from "@/lib/studio-theme/types";

/**
 * Scoped root for **public studio pages only**. Injects curated CSS variables + layout hooks.
 * Must not wrap platform (dashboard/admin) surfaces.
 */
export function StudioThemeRoot({ theme, children }: { theme: ResolvedStudioPublicTheme; children: ReactNode }) {
  return (
    <div className={theme.surfaceClassName} style={theme.cssVariables as CSSProperties}>
      {children}
    </div>
  );
}
