import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let cached: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (cached) return cached;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 submissions/minute per IP (MVP)
  });

  return cached;
}

/**
 * When Upstash is not configured (common in local dev), rate limiting is skipped.
 */
export async function rateLimitByIp(ip: string) {
  const rl = getRatelimit();
  if (!rl) {
    return { success: true, limit: 0, remaining: 999, reset: 0 };
  }
  return rl.limit(ip);
}
