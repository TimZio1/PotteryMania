declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MetaPixelTrackOptions = Record<string, unknown>;

type MetaPixelQueuedEvent = {
  name: string;
  options?: MetaPixelTrackOptions;
  eventOptions?: { eventID?: string };
};

const pendingEvents: MetaPixelQueuedEvent[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollDeadline = 0;

function isFbqCallable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

function stopPoll() {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function flushPendingEvents() {
  if (!isFbqCallable()) return;
  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift()!;
    if (event.eventOptions?.eventID) {
      window.fbq!("track", event.name, event.options ?? {}, event.eventOptions);
    } else {
      window.fbq!("track", event.name, event.options);
    }
  }
  stopPoll();
}

/** Fire a standard Meta Pixel event (client-only; no-op if pixel not loaded). */
export function trackMetaPixelEvent(
  name: string,
  options?: MetaPixelTrackOptions,
  /** Same `eventID` as server CAPI `event_id` for deduplication. */
  eventOptions?: { eventID?: string },
): void {
  if (typeof window === "undefined") return;
  pendingEvents.push({ name, options, eventOptions });
  flushPendingEvents();
  if (pendingEvents.length === 0 || pollTimer != null) return;
  pollDeadline = Date.now() + 12_000;
  pollTimer = setInterval(() => {
    flushPendingEvents();
    if (pendingEvents.length === 0) return;
    if (Date.now() >= pollDeadline) {
      pendingEvents.length = 0;
      stopPoll();
    }
  }, 50);
}
