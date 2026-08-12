import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Fallback mock rate limiter for development
const mockAllowLimiter = {
  limit: async () => ({ success: true, limit: 100, remaining: 99, reset: Date.now() }),
};

// Fail-safe limiter for production when Redis is misconfigured
const mockDenyLimiter = {
  limit: async () => ({ success: false, limit: 0, remaining: 0, reset: Date.now() }),
};

const isRedisAvailable = !!redis;
const isProd = process.env.NODE_ENV === "production";

export const rateLimiters = {
  auth: isRedisAvailable
    ? new Ratelimit({ redis: redis as Redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "@upstash/ratelimit/auth" })
    : (isProd ? mockDenyLimiter : mockAllowLimiter),

  ai: isRedisAvailable
    ? new Ratelimit({ redis: redis as Redis, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "@upstash/ratelimit/ai" })
    : (isProd ? mockDenyLimiter : mockAllowLimiter),

  upload: isRedisAvailable
    ? new Ratelimit({ redis: redis as Redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "@upstash/ratelimit/upload" })
    : (isProd ? mockDenyLimiter : mockAllowLimiter),
};

export function getIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export function getRateLimitKey(ip: string, userId?: string) {
  if (userId) return `user:${userId}:ip:${ip}`;
  return `ip:${ip}`;
}
