type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function assertRateLimit(req: Request, scope: string, limit: number, windowMs: number) {
  return checkRateLimit(`${scope}:${getClientKey(req)}`, limit, windowMs);
}
