/**
 * 缓存层 - 热数据缓存，减轻数据库压力
 */

class MemoryCache {
  constructor({ defaultTtl = 30000, maxSize = 10000 } = {}) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;

    // 定时清理过期
    this.cleanupInterval = setInterval(() => this._cleanup(), defaultTtl);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs) {
    // 超出容量时淘汰最早的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtl),
    });
  }

  del(key) {
    this.cache.delete(key);
  }

  /**
   * 缓存穿透保护：先查缓存，没有再调 loader，并缓存结果
   */
  async getOrLoad(key, loader, ttlMs) {
    let value = this.get(key);
    if (value !== undefined) return value;

    value = await loader();
    if (value !== undefined && value !== null) {
      this.set(key, value, ttlMs);
    }
    return value;
  }

  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%'
        : 'N/A',
    };
  }
}

// ========== 预配置的缓存实例 ==========

// 考试信息缓存（变更不频繁，TTL 长）
const examCache = new MemoryCache({ defaultTtl: 60000, maxSize: 500 });

// 题目缓存
const questionCache = new MemoryCache({ defaultTtl: 60000, maxSize: 2000 });

// 用户信息缓存
const userCache = new MemoryCache({ defaultTtl: 30000, maxSize: 5000 });

module.exports = { MemoryCache, examCache, questionCache, userCache };
