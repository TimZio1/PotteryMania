declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MetaPixelTrackOptions = Record<string, string | number | boolean | undefined>;

/** Fire a standard Meta Pixel event (client-only; no-op if pixel not loaded). */
export function trackMetaPixelEvent(
  name: string,
  options?: MetaPixelTrackOptions,
  /** Same `eventID` as server CAPI `event_id` for deduplication. */
  eventOptions?: { eventID?: string },
): void {
  if (typeof window === "undefined") return;
  if (eventOptions?.eventID) {
    window.fbq?.("track", name, options ?? {}, eventOptions);
  } else {
    window.fbq?.("track", name, options);
  }
}
