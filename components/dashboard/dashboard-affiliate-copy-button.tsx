"use client";

import { useCallback, useState } from "react";
import { platformUi } from "@/lib/ui-styles";

export function DashboardAffiliateCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button type="button" onClick={copy} className={`${platformUi.buttonSecondary} shrink-0 text-sm`}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
