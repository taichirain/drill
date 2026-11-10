const Redis = require('ioredis');
const config = require('../config');

let redis = null;
let useMemoryFallback = false;

// 内存降级方案（没有 Redis 时用）
const memoryStore = new Map();
const memoryTimers = new Map();

function createMemoryClient() {
  return {
    async set(key, value, ...args) {
      memoryStore.set(key, value);
      // 处理 EX 过期
      const exIdx = args.indexOf('EX');
      if (exIdx !== -1 && args[exIdx + 1]) {
        const ttl = parseInt(args[exIdx + 1]) * 1000;
        if (memoryTimers.has(key)) clearTimeout(memoryTimers.get(key));
        memoryTimers.set(key, setTimeout(() => {
          memoryStore.delete(key);
          memoryTimers.delete(key);
        }, ttl));
      }
      return 'OK';
    },
    async get(key) {
      return memoryStore.get(key) || null;
    },
    async del(key) {
      memoryStore.delete(key);
      if (memoryTimers.has(key)) {
        clearTimeout(memoryTimers.get(key));
        memoryTimers.delete(key);
      }
      return 1;
    },
    async publish(channel, message) {
      // 内存模式下 pub/sub 通过事件模拟
      if (this._subscribers && this._subscribers[channel]) {
        this._subscribers[channel].forEach(cb => cb(channel, message));
      }
      return 0;
    },
    _subscribers: {},
    subscribe(channel) {
      if (!this._subscribers[channel]) this._subscribers[channel] = [];
    },
    on(event, callback) {
      if (event === 'message') {
        // 注册到所有已订阅的频道
        Object.keys(this._subscribers).forEach(ch => {
          this._subscribers[ch].push(callback);
        });
      }
    },
    duplicate() {
      return createMemoryClient();
    },
  };
}

function getRedis() {
  if (redis) return redis;

  if (!config.redis.enabled) {
    console.log('⚠️  Redis 未启用，使用内存模式（不适合生产环境）');
    useMemoryFallback = true;
    redis = createMemoryClient();
    return redis;
  }

  try {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy(times) {
        if (times > 3) {
          console.log('⚠️  Redis 连接失败，降级为内存模式');
          useMemoryFallback = true;
          redis = createMemoryClient();
          return null; // 停止重试
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      if (!useMemoryFallback) {
        console.error('Redis 错误:', err.message);
      }
    });

    redis.on('connect', () => {
      console.log('✅ Redis 已连接');
    });
  } catch (err) {
    console.log('⚠️  Redis 初始化失败，使用内存模式');
    useMemoryFallback = true;
    redis = createMemoryClient();
  }

  return redis;
}

module.exports = { getRedis };
