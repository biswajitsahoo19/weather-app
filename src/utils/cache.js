'use strict';

/** Minimal in-memory TTL cache. */
class TTLCache {
  constructor(ttlMs, maxEntries = 200) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries) {
      // Evict the oldest entry (Map preserves insertion order)
      this.store.delete(this.store.keys().next().value);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

module.exports = TTLCache;
