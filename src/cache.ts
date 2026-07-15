interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory TTL cache. Interface is intentionally Redis-shaped (get/set/delete/clear)
// so a Redis adapter can replace it without touching call sites.
export class TtlCache<T> {
  private entries = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;
  private maxEntries: number;

  constructor(defaultTtlMs: number, maxEntries = 1000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest entry when at capacity (Map preserves insertion order)
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  // Deletes every key starting with the given prefix (e.g. invalidate one board's reads)
  deletePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
