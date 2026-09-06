/**
 * server/middleware/rateLimiter.js
 * In-memory sliding window rate limiter middleware for sensitive auth routes.
 */

const attempts = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now > record.resetTime) {
      attempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware function
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 mins)
 * @param {number} options.maxRequests - Max allowed requests per window (default: 10)
 * @param {string} options.message - Custom error message
 */
function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxRequests = 10,
  message = 'Too many authentication attempts. Please try again later.'
} = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const routeKey = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    let record = attempts.get(routeKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      attempts.set(routeKey, record);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: message,
        retry_after_seconds: retryAfterSeconds
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    next();
  };
}

module.exports = {
  createRateLimiter,
  authRateLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  })
};
