'use strict';

/** Fixed-window, per-IP rate limiter. */
class RateLimiter {
  constructor({ windowMs, maxRequests }) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Periodically clean expired windows
    setInterval(() => {
      const now = Date.now();
      for (const [ip, rec] of this.hits) {
        if (now > rec.resetAt) this.hits.delete(ip);
      }
    }, windowMs).unref();
  }

  /** Returns true if the request is allowed. */
  allow(ip) {
    const now = Date.now();
    let rec = this.hits.get(ip);
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(ip, rec);
    }
    rec.count += 1;
    return rec.count <= this.maxRequests;
  }
}

module.exports = RateLimiter;
