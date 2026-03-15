import rateLimit from "express-rate-limit";

/**
 * Create rate limiter middleware
 * Prevents API abuse per IP / API key
 */
export function createRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      hint: "Rate limit: 100 requests per minute. Upgrade your plan for higher limits.",
    },
  });
}
