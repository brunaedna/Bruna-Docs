type RateLimitStatement = {
  bind: (...values: unknown[]) => RateLimitStatement;
  first: <T>() => Promise<T | null>;
};

export type RateLimitDatabase = {
  prepare: (query: string) => RateLimitStatement;
};

export async function hashRateLimitKey(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function isDistributedRateLimited(
  database: RateLimitDatabase,
  key: string,
  now = Date.now(),
  maxRequests = 12,
  windowMs = 10 * 60 * 1000,
) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs * 2;
  const keyHash = await hashRateLimitKey(key);
  const row = await database
    .prepare(
      `
    INSERT INTO request_rate_limits (key_hash, window_start, request_count, expires_at)
    VALUES (?1, ?2, 1, ?3)
    ON CONFLICT(key_hash, window_start)
    DO UPDATE SET request_count = request_count + 1, expires_at = excluded.expires_at
    RETURNING request_count
  `,
    )
    .bind(keyHash, windowStart, expiresAt)
    .first<{ request_count: number }>();

  return Number(row?.request_count ?? 1) > maxRequests;
}
