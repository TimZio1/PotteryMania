"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf9f7", color: "#1c1917", padding: "4rem 2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something broke on our side</h1>
        <p style={{ marginTop: "1rem", color: "#78716c" }}>
          We&apos;ve been notified and we&apos;re looking into it. Try again in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 2rem",
            background: "#1c1917",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
