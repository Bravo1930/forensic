import { createHash } from "crypto";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  private generateKey(...parts: string[]): string {
    return createHash("sha256")
      .update(parts.join("|"))
      .digest("hex")
      .slice(0, 16);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number = 3600000): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  generateKeyFromParams(...parts: string[]): string {
    return this.generateKey(...parts);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

export const llmCache = new MemoryCache(500);
export const metadataCache = new MemoryCache<Record<string, unknown>>(1000);

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}
