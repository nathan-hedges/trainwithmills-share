/**
 * Rate limiting for the public endpoints, backed by Upstash Redis. If Upstash
 * isn't configured (e.g. local dev, or before the env vars are set), it fails
 * OPEN - requests pass through and nothing is limited - with a one-time warning.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;
if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[ratelimit] Upstash not configured - rate limiting disabled (failing open).");
}

const limiters = redis
  ? {
      // sensitive: auth + contact (spam / brute-force surface)
      strict: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "twm:strict", analytics: false }),
      // everything else public/expensive (e.g. upload presign)
      standard: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "60 s"), prefix: "twm:std", analytics: false }),
    }
  : null;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/**
 * Returns a 429 Response if the caller is over the limit, else null.
 * `bucket` namespaces the counter per endpoint; pass `id` to key by something
 * other than IP (e.g. the signed-in user's id for an auth-gated route).
 */
export async function rateLimit(
  req: Request,
  bucket: string,
  tier: "strict" | "standard" = "strict",
  id?: string,
): Promise<Response | null> {
  if (!limiters) return null; // fail open when unconfigured
  const { success, reset } = await limiters[tier].limit(`${bucket}:${id ?? clientIp(req)}`);
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response("Too many requests - please slow down and try again shortly.", {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}
